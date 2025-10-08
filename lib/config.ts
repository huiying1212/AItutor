const toolsDefinition = [
  {
    name: "search_knowledge",
    description: "Search the multimodal knowledge database for relevant information to enhance explanations",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant knowledge from the database",
        },
        top_k: {
          type: "number",
          description: "Number of top results to return (default: 3)",
          default: 3
        }
      },
      required: ["query"],
    },
  },
  {
    name: "display_content",
    description: "Display content on the whiteboard including text, diagrams, charts, or images when explaining concepts to students",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the content to display on the whiteboard",
        },
        content: {
          type: "string", 
          description: "The main text content to display, can include markdown formatting",
        },
        highlightedText: {
          type: "string",
          description: "Optional single phrase to highlight within the content",
        },
        highlightedTerms: {
          type: "array",
          description: "Optional multiple terms/phrases to highlight within the content",
          items: { type: "string" }
        },
        type: {
          type: "string",
          enum: ["text", "chart", "diagram", "list", "images"],
          description: "The type of content to display",
        },
        chart: {
          type: "object",
          description: "Chart data if type is 'chart'",
          properties: {
            chartType: {
              type: "string",
              enum: ["bar", "pie", "line"],
              description: "Type of chart to display"
            },
            data: {
              type: "array",
              description: "Chart data points",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "number" }
                }
              }
            }
          }
        },
        items: {
          type: "array",
          description: "List items if type is 'list'",
          items: {
            type: "string",
            description: "Individual list item"
          }
        },
        images: {
          type: "array",
          description: "Array of image objects to display when type is 'images' or to display alongside other content",
          items: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL path to the image"
              },
              description: {
                type: "string", 
                description: "Description of what the image shows"
              },
              chapter: {
                type: "string",
                description: "Source chapter or context"
              }
            }
          }
        }
      },
      required: ["title", "content", "type"],
    },
  },
  {
    name: "clear_whiteboard",
    description: "Clear the whiteboard when starting a new topic or when the student requests it",
    parameters: {},
  },
  {
    name: "highlight_text",
    description: "Highlight specific text on the whiteboard for emphasis",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to highlight on the whiteboard",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "create_mindmap",
    description: "Create an interactive mind map to summarize conversation topics, concepts, or knowledge structures",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The main title/central topic of the mind map",
        },
        nodes: {
          type: "array",
          description: "Array of key concepts/nodes in the mind map",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Unique identifier for the node"
              },
              keyword: {
                type: "string",
                description: "The main keyword/concept for this node"
              },
              description: {
                type: "string",
                description: "Detailed description of the concept"
              },
              otherinfo: {
                type: "string",
                description: "Additional information or context"
              },
              image: {
                type: "string",
                description: "Optional image filename if available from knowledge base"
              },
              isExtendedInfo: {
                type: "number",
                description: "Flag indicating if this is extended information (0 or 1)",
                default: 0
              }
            },
            required: ["id", "keyword"]
          }
        },
        connections: {
          type: "array",
          description: "Array of connections between nodes",
          items: {
            type: "object",
            properties: {
              from: {
                type: "string",
                description: "Source node ID"
              },
              to: {
                type: "string",
                description: "Target node ID"
              },
              relationship: {
                type: "string",
                description: "Description of the relationship between nodes"
              }
            },
            required: ["from", "to", "relationship"]
          }
        }
      },
      required: ["title", "nodes", "connections"],
    },
  }
];

export const TOOLS = toolsDefinition.map((tool) => ({
  type: "function",
  ...tool,
}));

export const INSTRUCTIONS = `
You are an intelligent teaching assistant helping students learn design history through voice interaction and visual whiteboard presentation.

LANGUAGE CONSISTENCY: Always respond in the same language that the student is using(Chinese or English). If the student asks in English, respond in English. If the student asks in Chinese, respond in Chinese. Maintain language consistency throughout the conversation.

CRITICAL RAG-ENHANCED WORKFLOW: For EVERY student question, you MUST:
1. FIRST call search_knowledge to find relevant information from the knowledge database
2. ANALYZE the search results: check if the results is true and organize them into a slide-ready sources
3. THEN call display_content with CONCISE visual content that incorporates the retrieved knowledge to present a teaching slide
4. FINALLY provide your detailed verbal explanation that combines the retrieved knowledge with your own understanding

KNOWLEDGE SEARCH GUIDELINES:
- Always use search_knowledge first with the main topic or key concepts from the student's question
- Use retrieved knowledge to provide more accurate and comprehensive explanations
- If knowledge_found is true, incorporate the retrieved knowledge into your explanation
- Reference the sources when presenting information from the knowledge base
- If knowledge_found is false or empty, proceed with your own knowledge
- Use specific examples and details from the retrieved context when available
- If relevant images are found and can match the content, please include the needed pics in your display_content call using the images parameter. 
VOICE EXPLAINATION GUIDELINES:
- Your VOICE provides the detailed explanations and context
- Your spoken explanation should support the content on the whiteboard
- Avoid long paragraphs or dense text that competes with your voice
- PROVIDE your detailed verbal explanation that expands on what's shown, weaving in the retrieved knowledge naturally with proper source attribution
- Use additional tools (highlight_text, clear_whiteboard) as needed
- ALWAYS provide a complete spoken response after using tools
WHITEBOARD CONTENT GUIDELINES:
- Use SHORT bullet points when necessary
- Keep titles short and clear
- Incorporate key insights from retrieved knowledge with source attribution
- When images are available and relevant, include them to enhance visual understanding

Example of GOOD RAG-enhanced workflow:
- Student asks "设计历史" → Search "设计历史" → If knowledge found, show: Key design movements/periods from knowledge base + sources + relevant images

Tool usage patterns:
- search_knowledge: ALWAYS use first for every question to find relevant information
- display_content with type="text": For brief definitions, key formulas, essential keywords enhanced with retrieved knowledge
- display_content with type="list": For numbered steps (short phrases only), key bullet points with knowledge base insights
- display_content with type="chart": For data comparisons, simple visual relationships using retrieved data when available
- display_content with type="images": For primarily visual content with supporting text
- display_content with images parameter: For any content type that can benefit from visual enhancement
- highlight_text: To emphasize specific terms during your spoken explanation
- clear_whiteboard: When switching to a completely different topic
- create_mindmap: When students ask for conversation summaries, topic overviews, or when explaining complex relationships between concepts. Use this to create interactive visual summaries that show connections between ideas discussed in the conversation.

`;

export const VOICE = "coral";
