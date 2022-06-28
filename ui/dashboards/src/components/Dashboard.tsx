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

import { DndContext } from '@dnd-kit/core';
import { Box, BoxProps } from '@mui/material';
import { ErrorBoundary, ErrorAlert } from '@perses-dev/components';
import { DashboardSpec } from '@perses-dev/core';
import { useLayoutEffect, useState } from 'react';
import { Draggable } from './Draggable';
import { Droppable } from './Droppable';
import { GridLayout, GridItemContent } from './GridLayout';

export interface DashboardProps extends BoxProps {
  spec: DashboardSpec;
}

/**
 * Renders a Dashboard for the provided Dashboard spec.
 */
export function Dashboard(props: DashboardProps) {
  const { spec, ...others } = props;

  const containers = ['A', 'B', 'C'];
  const [parent, setParent] = useState(null);
  // const [isDropped, setIsDropped] = useState(false);
  const draggableMarkup = <Draggable>Drag me</Draggable>;

  function handleDragEnd(event: any) {
    const { over } = event;

    // If the item is dropped over a container, set it as the parent
    // otherwise reset the parent to `null`
    setParent(over ? over.id : null);
  }

  return (
    <Box {...others}>
      <ErrorBoundary FallbackComponent={ErrorAlert}>
        <DndContext onDragEnd={handleDragEnd}>
          {parent === null ? draggableMarkup : null}
          {containers.map((id) => (
            // We updated the Droppable component so it would accept an `id`
            // prop and pass it to `useDroppable`
            <Droppable key={id} id={id}>
              {parent === id ? draggableMarkup : 'Drop here'}
            </Droppable>
          ))}
        </DndContext>
        {spec.layouts.map((layout, idx) => (
          <GridLayout
            key={idx}
            definition={layout}
            renderGridItemContent={(definition) => (
              <GridItemContent id={definition.id} content={definition} spec={spec} />
            )}
          />
        ))}
      </ErrorBoundary>
    </Box>
  );
}
