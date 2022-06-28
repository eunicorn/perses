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

import { useState } from 'react';
import { Box, BoxProps, Collapse } from '@mui/material';
import { GridDefinition, GridItemDefinition } from '@perses-dev/core';
import { GridTitle } from './GridTitle';
import { Droppable } from '../Droppable';
import { SortableItem } from '../SortableItem';
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { render } from '@testing-library/react';

const COLUMNS = 24;

export interface GridLayoutProps extends BoxProps {
  definition: GridDefinition;
  renderGridItemContent: (definition: GridItemDefinition) => React.ReactNode;
}

/**
 * Layout component that arranges children in a Grid based on the definition.
 */
export function GridLayout(props: GridLayoutProps) {
  const {
    definition: { spec },
    renderGridItemContent,
    ...others
  } = props;

  const [isOpen, setIsOpen] = useState(spec.display?.collapse?.open ?? true);

  console.log(spec.items);

  const gridItems: React.ReactNode[] = [];
  let mobileRowStart = 1;

  // const sortItems: string[] = [];
  const [activeId, setActiveId] = useState(null);
  const [sortItems, setItems] = useState(spec.items);

  sortItems.forEach((item, idx) => {
    // spec.items.indexOf()
    // Try to maintain the chart's aspect ratio on mobile
    const widthScale = COLUMNS / item.width;
    const mobileRows = Math.floor(item.height * widthScale);

    console.log('item', item);

    gridItems.push(
      <Box
        key={idx}
        sx={{
          gridColumn: {
            xs: `1 / span ${COLUMNS}`,
            sm: `${item.x + 1} / span ${item.width}`,
          },
          gridRow: {
            xs: `${mobileRowStart} / span ${mobileRows}`,
            sm: `${item.y + 1} / span ${item.height}`,
          },
        }}
      >
        {renderGridItemContent(item)}
      </Box>
      // <>{renderGridItemContent(item)}</>
    );

    mobileRowStart += mobileRows;
  });

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;

    console.log('event', event);

    // if (active.id !== over.id) {
    //   setItems((items) => {
    //     // console.log('items', items);
    //     const oldIndex = items.findIndex((item) => item.id === active.id);
    //     // console.log('oldIndex', oldIndex);
    //     const newIndex = items.findIndex((item) => item.id === over.id);
    //     // console.log('newIndex', newIndex);

    //     const newItems = arrayMove(items, oldIndex, newIndex);
    //     console.log('newItems', newItems);
    //     return newItems;
    //   });
    // }
  };

  const items = sortItems.map((item) => item.id!);

  return (
    <Box {...others} component="section" sx={{ '& + &': { marginTop: (theme) => theme.spacing(1) } }}>
      {spec.display !== undefined && (
        <GridTitle
          title={spec.display.title}
          collapse={
            spec.display.collapse === undefined
              ? undefined
              : { isOpen, onToggleOpen: () => setIsOpen((current) => !current) }
          }
        />
      )}
      <Collapse in={isOpen} unmountOnExit>
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={disableSortingStrategy}>
            <Box
              data-automation-id={'ROW'}
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, // # of columns
                gridAutoRows: {
                  xs: 24,
                  sm: 36,
                },
                columnGap: (theme) => theme.spacing(1),
                rowGap: (theme) => theme.spacing(1),
                // gridAutoRow: 'row dense',
              }}
            >
              {gridItems}
            </Box>
          </SortableContext>
          <DragOverlay adjustScale={false}>
            {activeId ? (
              <div
                style={{
                  display: 'grid',
                  gridAutoColumns: 'auto',
                  gridAutoRows: 'auto',
                  height: '100%',
                  backgroundColor: 'rgba(136,153,168,1.00)',
                }}
              ></div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Collapse>
    </Box>
  );

  function disableSortingStrategy() {
    return null;
  }
}
