import { dia } from '@joint/core';

export const HEADER_H = 40;
export const ROW_H = 80;
export const FOOTER_H = 40;
export const EMPTY_H = 60;
export const TABLE_WIDTH = 320;

export function computeTableHeight(columnCount) {
  const bodyHeight = columnCount > 0
    ? columnCount * ROW_H
    : EMPTY_H;

  return HEADER_H + bodyHeight + FOOTER_H;
}

export function rowCenterY(index) {
  return HEADER_H + index * ROW_H + ROW_H / 2;
}

export function buildPortItems(columns) {
  return columns.flatMap((column, index) => {
    const y = rowCenterY(index);

    return [
      {
        id: `${column.id}__left`,
        group: 'left',
        args: { x: 0, y },
      },
      {
        id: `${column.id}__right`,
        group: 'right',
        args: { x: TABLE_WIDTH, y },
      },
    ];
  });
}

export const Table = dia.Element.define(
  'app.Table',
  {
    size: { width: TABLE_WIDTH, height: computeTableHeight(0) },
    z: 10,
    attrs: { root: { magnet: false } },
    ports: {
      groups: {
        left: {
          position: { name: 'absolute' },
          markup: [{ tagName: 'circle', selector: 'portBody' }],
          attrs: {
            portBody: {
              r: 6,
              magnet: true,
              fill: '#11111a',
              stroke: '#8b5cf6',
              strokeWidth: 2,
              cursor: 'crosshair',
            },
          },
        },
        right: {
          position: { name: 'absolute' },
          markup: [{ tagName: 'circle', selector: 'portBody' }],
          attrs: {
            portBody: {
              r: 6,
              magnet: true,
              fill: '#11111a',
              stroke: '#8b5cf6',
              strokeWidth: 2,
              cursor: 'crosshair',
            },
          },
        },
      },
      items: [],
    },
    data: { name: 'new_table', columns: [] },
  },
  {
    markup: [
      {
        tagName: 'foreignObject',
        selector: 'fo',
        attributes: { style: 'overflow: visible;' },
        children: [
          {
            tagName: 'div',
            selector: 'foContent',
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            style: { width: '100%', height: '100%' },
          },
        ],
      },
    ],
  }
);

export const Relationship = dia.Link.define(
  'app.Relationship',
  {
    router: {
      name: 'manhattan',
      args: { padding: 20, step: 20, maximumLoops: 2000, perpendicular: true },
    },
    connector: { name: 'rounded', args: { radius: 12 } },
    attrs: {
      line: {
        connection: true,
        stroke: '#7357ff',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
        targetMarker: {
          type: 'path',
          d: 'M 10 -5 0 0 10 5 Z',
          fill: '#7357ff',
          stroke: 'none',
        },
      },
      wrapper: {
        connection: true,
        stroke: 'transparent',
        strokeWidth: 14,
        fill: 'none',
        cursor: 'pointer',
      },
    },
    data: {},
    z: 0,
  },
  {
    markup: [
      { tagName: 'path', selector: 'wrapper', attributes: { fill: 'none' } },
      { tagName: 'path', selector: 'line', attributes: { fill: 'none' } },
    ],
  }
);

export function setSelected(link, selected) {
  link.attr({
    line: {
      stroke: selected ? '#a78bfa' : '#7357ff',
      strokeWidth: selected ? 2.5 : 1.8,
      filter: selected
        ? 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.52))'
        : 'drop-shadow(0 1px 2px rgba(20, 16, 50, 0.35))',
    },
  });
}

export function manhattanRouter(sourcePort, targetPort) {
  return {
    name: 'manhattan',
    args: { padding: 20, step: 20, maximumLoops: 2000, perpendicular: true },
  };
}
