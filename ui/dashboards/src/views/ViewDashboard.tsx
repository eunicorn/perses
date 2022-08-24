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

import produce from 'immer';
import { Box, BoxProps, Button } from '@mui/material';
import { combineSx } from '@perses-dev/components';
import { DashboardResource } from '@perses-dev/core';
import PencilIcon from 'mdi-material-ui/PencilOutline';
import AddIcon from 'mdi-material-ui/Plus';
import { TimeRangeStateProvider, TemplateVariablesProvider } from '../context';
import { Dashboard, VariableList } from '../components';
import { usePanels, useEditMode, useLayouts } from '../context/store';

export interface ViewDashboardProps extends BoxProps {
  dashboardResource: DashboardResource;
}

/**
 * The View for displaying a Dashboard, along with the UI for selecting variable values.
 */
export function ViewDashboard(props: ViewDashboardProps) {
  const { dashboardResource, sx, children, ...others } = props;

  const { isEditMode, setEditMode } = useEditMode();
  const { addPanel } = usePanels();
  const { layouts, setLayouts } = useLayouts();

  const onEditClick = () => {
    setEditMode(true);
  };

  const onAddPanel = () => {
    const newPanel = {
      kind: 'EmptyChart',
      display: {
        name: 'New Panel',
      },
      options: {},
    };
    addPanel('newPanel', newPanel);
    const newLayouts = produce(layouts, (draftState) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      draftState[0]!.spec.items.unshift({
        x: 0,
        y: 0,
        height: 6,
        width: 12,
        content: { $ref: '#/spec/panels/newPanel' },
      });
    });
    setLayouts(newLayouts);
  };

  return (
    <TimeRangeStateProvider initialValue={{ pastDuration: dashboardResource.spec.duration }}>
      <TemplateVariablesProvider variableDefinitions={dashboardResource.spec.variables}>
        <Box
          sx={combineSx(
            {
              display: 'flex',
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            },
            sx
          )}
          {...others}
        >
          <Box
            sx={{
              padding: (theme) => theme.spacing(1, 2),
              flexGrow: 1,
              overflowX: 'hidden',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isEditMode ? (
              <Button
                sx={{
                  alignSelf: 'flex-end',
                }}
                onClick={onAddPanel}
              >
                <AddIcon sx={{ fontSize: '1rem', marginRight: '8px' }} />
                Add Panel
              </Button>
            ) : (
              <Button
                variant="contained"
                sx={{
                  alignSelf: 'flex-end',
                }}
                onClick={onEditClick}
              >
                <PencilIcon sx={{ fontSize: '1rem', marginRight: '8px' }} />
                Edit
              </Button>
            )}
            <VariableList
              variables={dashboardResource.spec.variables}
              sx={{ margin: (theme) => theme.spacing(1, 0, 2) }}
            />
            <Dashboard spec={dashboardResource.spec} />
            {children}
          </Box>
        </Box>
      </TemplateVariablesProvider>
    </TimeRangeStateProvider>
  );
}
