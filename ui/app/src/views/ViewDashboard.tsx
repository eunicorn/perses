// Copyright 2021 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DashboardResource } from '@perses-dev/core';
import { DashboardProvider, ViewDashboard as DashboardView } from '@perses-dev/dashboards';
import Footer from '../components/Footer';
import { useSampleData } from '../utils/temp-sample-data';

/**
 * The View for viewing a Dashboard.
 */
function ViewDashboard() {
  const dashboard = useSampleData<DashboardResource>(
    new URLSearchParams(window.location.search).get('dashboard') || 'node-exporter-full'
  );

  // TODO: Loading indicator
  if (dashboard === undefined) {
    return null;
  }

  return (
    <DashboardProvider dashboardSpec={dashboard.spec}>
      <DashboardView dashboardResource={dashboard}>
        <Footer />
      </DashboardView>
    </DashboardProvider>
  );
}

export default ViewDashboard;
