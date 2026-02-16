// PostHog Dashboard Creator for Ramadan Clock
// Paste this entire script into the browser console while logged into PostHog
//
// Custom events tracked:
//   app_loaded, theme_toggled, cache_cleared, day_shared, day_navigated,
//   day_selected, settings_saved, settings_opened, month_view_opened,
//   month_shared, install_banner_shown, pwa_installed, install_prompt_response,
//   install_banner_dismissed, ios_install_banner_shown, ios_install_banner_dismissed

(async () => {
  // --- Config ---
  const TEAM_ID = window.POSTHOG_APP_CONTEXT?.current_team?.id
    ?? document.cookie.match(/posthog_current_team_id=(\d+)/)?.[1]
    ?? prompt('Enter your PostHog Team ID (check URL: /project/<ID>):');

  if (!TEAM_ID) { console.error('No team ID found. Aborting.'); return; }

  // Grab CSRF token
  const csrfToken =
    document.cookie.match(/posthog_csrftoken=([^;]+)/)?.[1]
    ?? document.querySelector('meta[name="csrf-token"]')?.content
    ?? document.querySelector('[name=csrfmiddlewaretoken]')?.value;

  if (!csrfToken) { console.error('No CSRF token found. Make sure you are logged in.'); return; }

  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  };

  async function api(method, path, body) {
    const url = `/api/projects/${TEAM_ID}${path}`;
    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  // Helper: create an insight and return its ID
  async function createInsight(insight) {
    const result = await api('POST', '/insights/', insight);
    console.log(`  Created insight: ${insight.name} (id: ${result.id})`);
    return result.short_id;
  }

  // Helper: create a dashboard, then add tiles
  async function createDashboard(name, description, insightShortIds) {
    const dash = await api('POST', '/dashboards/', {
      name,
      description,
      filters: {},
    });
    console.log(`Created dashboard: ${name} (id: ${dash.id})`);

    for (const shortId of insightShortIds) {
      await api('POST', `/dashboards/${dash.id}/tiles/`, {
        insight: shortId,
      });
    }
    console.log(`  Added ${insightShortIds.length} tiles to "${name}"`);
    return dash;
  }

  // ============================================================
  // DASHBOARD 1: Usage Overview
  // ============================================================
  console.log('\n--- Creating Dashboard 1: Usage Overview ---');

  const d1_insights = [];

  // 1a. Daily active users (unique users firing app_loaded)
  d1_insights.push(await createInsight({
    name: 'Daily Active Users',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'dau',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 1b. Total pageloads over time
  d1_insights.push(await createInsight({
    name: 'App Loads Over Time',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'total',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 1c. Loads by Ramadan day
  d1_insights.push(await createInsight({
    name: 'Usage by Ramadan Day',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'total',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'ramadan_day', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  }));

  // 1d. PWA vs Browser split
  d1_insights.push(await createInsight({
    name: 'PWA vs Browser Users',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'dau',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'is_pwa', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 1e. iOS vs other
  d1_insights.push(await createInsight({
    name: 'iOS vs Other Users',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'dau',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'is_ios', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 1f. Theme preference
  d1_insights.push(await createInsight({
    name: 'Theme Preference (Dark vs Light)',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'theme', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  // 1g. Timezone distribution
  d1_insights.push(await createInsight({
    name: 'Users by Timezone',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'dau',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'timezone', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  }));

  await createDashboard(
    'Ramadan Clock - Usage Overview',
    'DAU, load trends, PWA adoption, platform split, timezones',
    d1_insights
  );

  // ============================================================
  // DASHBOARD 2: Referrer & Acquisition
  // ============================================================
  console.log('\n--- Creating Dashboard 2: Referrer & Acquisition ---');

  const d2_insights = [];

  // 2a. Referrer breakdown
  d2_insights.push(await createInsight({
    name: 'Traffic by Referrer',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'referrer', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  }));

  // 2b. Referrer over time
  d2_insights.push(await createInsight({
    name: 'Referrer Trend Over Time',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'app_loaded',
          math: 'total',
        }],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'referrer', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 2c. PWA install funnel
  d2_insights.push(await createInsight({
    name: 'PWA Install Funnel',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          { kind: 'EventsNode', event: 'install_banner_shown' },
          { kind: 'EventsNode', event: 'pwa_installed' },
        ],
        dateRange: { date_from: '-30d' },
        funnelsFilter: {
          funnelVizType: 'steps',
        },
      },
    },
  }));

  // 2d. iOS install funnel
  d2_insights.push(await createInsight({
    name: 'iOS Install Banner Funnel',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          { kind: 'EventsNode', event: 'ios_install_banner_shown' },
          { kind: 'EventsNode', event: 'ios_install_banner_dismissed' },
        ],
        dateRange: { date_from: '-30d' },
        funnelsFilter: {
          funnelVizType: 'steps',
        },
      },
    },
  }));

  // 2e. Install prompt outcomes
  d2_insights.push(await createInsight({
    name: 'Install Prompt Outcomes',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'install_prompt_response',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'outcome', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  await createDashboard(
    'Ramadan Clock - Referrer & Acquisition',
    'Traffic sources, referrer trends, PWA install funnels',
    d2_insights
  );

  // ============================================================
  // DASHBOARD 3: User Behavior
  // ============================================================
  console.log('\n--- Creating Dashboard 3: User Behavior ---');

  const d3_insights = [];

  // 3a. Feature usage breakdown (all key actions)
  d3_insights.push(await createInsight({
    name: 'Feature Usage (All Actions)',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [
          { kind: 'EventsNode', event: 'day_navigated', math: 'total', name: 'Day Navigated' },
          { kind: 'EventsNode', event: 'day_selected', math: 'total', name: 'Day Selected' },
          { kind: 'EventsNode', event: 'day_shared', math: 'total', name: 'Day Shared' },
          { kind: 'EventsNode', event: 'month_view_opened', math: 'total', name: 'Month View' },
          { kind: 'EventsNode', event: 'month_shared', math: 'total', name: 'Month Shared' },
          { kind: 'EventsNode', event: 'settings_opened', math: 'total', name: 'Settings Opened' },
          { kind: 'EventsNode', event: 'theme_toggled', math: 'total', name: 'Theme Toggled' },
        ],
        dateRange: { date_from: '-30d' },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  }));

  // 3b. Feature usage over time
  d3_insights.push(await createInsight({
    name: 'Feature Usage Over Time',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [
          { kind: 'EventsNode', event: 'day_shared', math: 'total', name: 'Day Shared' },
          { kind: 'EventsNode', event: 'month_view_opened', math: 'total', name: 'Month View' },
          { kind: 'EventsNode', event: 'settings_opened', math: 'total', name: 'Settings' },
          { kind: 'EventsNode', event: 'theme_toggled', math: 'total', name: 'Theme Toggle' },
        ],
        interval: 'day',
        dateRange: { date_from: '-30d' },
        trendsFilter: { display: 'ActionsLineGraph' },
      },
    },
  }));

  // 3c. Sharing methods
  d3_insights.push(await createInsight({
    name: 'Share Method Breakdown',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'day_shared',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'method', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  // 3d. Navigation direction (prev vs next)
  d3_insights.push(await createInsight({
    name: 'Day Navigation Direction',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'day_navigated',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'direction', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  // 3e. Calculation method distribution
  d3_insights.push(await createInsight({
    name: 'Calculation Method Preference',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'settings_saved',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'calc_method', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  // 3f. User journey funnel: load -> navigate -> share
  d3_insights.push(await createInsight({
    name: 'Engagement Funnel: Load > Navigate > Share',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          { kind: 'EventsNode', event: 'app_loaded' },
          { kind: 'EventsNode', event: 'day_navigated' },
          { kind: 'EventsNode', event: 'day_shared' },
        ],
        dateRange: { date_from: '-30d' },
        funnelsFilter: {
          funnelVizType: 'steps',
        },
      },
    },
  }));

  // 3g. Shares with vs without image
  d3_insights.push(await createInsight({
    name: 'Shares: With Image vs Without',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'day_shared',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'has_image', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsPie' },
      },
    },
  }));

  // 3h. Most shared Ramadan days
  d3_insights.push(await createInsight({
    name: 'Most Shared Ramadan Days',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{
          kind: 'EventsNode',
          event: 'day_shared',
          math: 'total',
        }],
        dateRange: { date_from: '-30d' },
        breakdownFilter: {
          breakdowns: [{ property: 'ramadan_day', type: 'event' }],
        },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  }));

  await createDashboard(
    'Ramadan Clock - User Behavior',
    'Feature usage, sharing patterns, navigation, engagement funnels',
    d3_insights
  );

  console.log('\n All 3 dashboards created! Check your PostHog Dashboards page.');
})();
