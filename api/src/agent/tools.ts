import { SchemaType, type FunctionDeclarationsTool } from '@google/generative-ai';

export const LAYOUT_AGENT_TOOLS: FunctionDeclarationsTool = {
  functionDeclarations: [
    {
      name: 'set_element_override',
      description:
        'Set or merge style, text, or visibility on one element by morph path.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: {
            type: SchemaType.STRING,
            description: 'Full morph path, e.g. morph.div:0.h1:0',
          },
          hidden: { type: SchemaType.BOOLEAN },
          text: { type: SchemaType.STRING },
          style: {
            type: SchemaType.OBJECT,
            description: 'CSS properties to merge',
            properties: {
              color: { type: SchemaType.STRING },
              backgroundColor: { type: SchemaType.STRING },
              fontSize: { type: SchemaType.STRING },
              fontWeight: { type: SchemaType.STRING },
              opacity: { type: SchemaType.STRING },
              padding: { type: SchemaType.STRING },
              margin: { type: SchemaType.STRING },
              width: { type: SchemaType.STRING },
              height: { type: SchemaType.STRING },
              gridColumn: { type: SchemaType.STRING },
              gridRow: { type: SchemaType.STRING },
            },
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'apply_scoped_overrides',
      description:
        'Apply multiple style, text, or visibility changes inside the current edit scope in one proposal.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          changes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                path: { type: SchemaType.STRING },
                hidden: { type: SchemaType.BOOLEAN },
                text: { type: SchemaType.STRING },
                style: {
                  type: SchemaType.OBJECT,
                  properties: {
                    color: { type: SchemaType.STRING },
                    backgroundColor: { type: SchemaType.STRING },
                    fontSize: { type: SchemaType.STRING },
                    fontWeight: { type: SchemaType.STRING },
                    opacity: { type: SchemaType.STRING },
                    padding: { type: SchemaType.STRING },
                    margin: { type: SchemaType.STRING },
                    width: { type: SchemaType.STRING },
                    height: { type: SchemaType.STRING },
                    gridColumn: { type: SchemaType.STRING },
                    gridRow: { type: SchemaType.STRING },
                  },
                },
              },
              required: ['path'],
            },
          },
        },
        required: ['changes'],
      },
    },
    {
      name: 'resize_grid_item',
      description:
        'Resize a selected-scope grid item horizontally by setting its grid column span.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },
          columnSpan: { type: SchemaType.NUMBER },
        },
        required: ['path', 'columnSpan'],
      },
    },
    {
      name: 'resize_box',
      description:
        'Resize a selected-scope non-grid box by setting width and/or height in pixels.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },
          width: { type: SchemaType.NUMBER },
          height: { type: SchemaType.NUMBER },
        },
        required: ['path'],
      },
    },
    {
      name: 'set_text',
      description: 'Set text on one text-leaf element inside the current edit scope.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },
          text: { type: SchemaType.STRING },
        },
        required: ['path', 'text'],
      },
    },
    {
      name: 'set_style',
      description: 'Set safe style properties on one element inside the current edit scope.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },
          style: {
            type: SchemaType.OBJECT,
            properties: {
              color: { type: SchemaType.STRING },
              backgroundColor: { type: SchemaType.STRING },
              fontSize: { type: SchemaType.STRING },
              fontWeight: { type: SchemaType.STRING },
              opacity: { type: SchemaType.STRING },
              padding: { type: SchemaType.STRING },
              margin: { type: SchemaType.STRING },
              width: { type: SchemaType.STRING },
              height: { type: SchemaType.STRING },
              gridColumn: { type: SchemaType.STRING },
              gridRow: { type: SchemaType.STRING },
            },
          },
        },
        required: ['path', 'style'],
      },
    },
    {
      name: 'remove_element_override',
      description: 'Remove all overrides for an element path.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },
        },
        required: ['path'],
      },
    },
    {
      name: 'reorder_children',
      description:
        'Reorder direct children of a parent. Use parentPath "morph" to reorder top-level page sections (segments from snapshot.nodes). For nested elements, use the parent element path. childOrder uses segment IDs only (e.g. section:0, div:1), not full paths.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          parentPath: { type: SchemaType.STRING },
          childOrder: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['parentPath', 'childOrder'],
      },
    },
  ],
};
