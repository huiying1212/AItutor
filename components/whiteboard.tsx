"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import "highlight.js/styles/github.css";
import MindMap from "./MindMap";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ToolCall {
  name: string;
  arguments: any;
}

interface WhiteboardProps {
  toolCall: ToolCall | null;
}

interface WhiteboardContent {
  title: string;
  content: string;
  type: "text" | "chart" | "diagram" | "list" | "images" | "mindmap";
  chart?: {
    chartType: "bar" | "pie" | "line";
    data: { label: string; value: number }[];
  };
  items?: string[];
  images?: {
    url: string;
    description: string;
    chapter: string;
  }[];
  mindMapData?: {
    title: string;
    nodes: Array<{
      id: string;
      keyword: string;
      description?: string;
      otherinfo?: string;
      image?: string;
      isExtendedInfo?: number;
    }>;
    connections: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };
  timestamp: number;
 // Add timestamp to track when slide was created
}

const Whiteboard: React.FC<WhiteboardProps> = ({ toolCall }) => {
  const [slides, setSlides] = useState<WhiteboardContent[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(-1);
  const [highlightedText, setHighlightedText] = useState<string>("");

  // Get current content based on slide index
  const content = currentSlideIndex >= 0 && currentSlideIndex < slides.length 
    ? slides[currentSlideIndex] 
    : null;

  useEffect(() => {
    if (!toolCall) return;

    console.log("Whiteboard received toolCall:", toolCall);

    const { name, arguments: toolArgs } = toolCall;
    let args: any = {};
    
    try {
      // Check if toolArgs is already an object or needs parsing
      if (typeof toolArgs === 'string') {
        // Ensure the string is not empty and is valid JSON
        if (toolArgs.trim() === '') {
          console.error("Empty toolArgs string");
          return;
        }
        args = JSON.parse(toolArgs);
      } else if (typeof toolArgs === 'object' && toolArgs !== null) {
        args = toolArgs;
      } else {
        console.error("Invalid toolArgs type:", typeof toolArgs);
        return;
      }
      console.log("Parsed arguments:", args);
    } catch (error) {
      console.error("Failed to parse toolCall arguments:", error, "Raw toolArgs:", toolArgs);
      return;
    }

    switch (name) {
      case "display_content":
        console.log("Displaying content on whiteboard:", args);
        const newContent: WhiteboardContent = {
          title: args.title || "",
          content: args.content || "",
          type: args.type || "text",
          chart: args.chart,
          items: args.items,
          images: args.images,
          timestamp: Date.now(),
        };
        
        // Add new slide to history
        setSlides(prevSlides => [...prevSlides, newContent]);
        break;

      case "clear_whiteboard":
        console.log("Clearing whiteboard");
        setSlides([]);
        setCurrentSlideIndex(-1);
        setHighlightedText("");
        break;

      case "highlight_text":
        console.log("Highlighting text:", args.text);
        setHighlightedText(args.text || "");
        break;

      case "create_mindmap":
        console.log("Creating mind map:", args);
        const newMindMapContent: WhiteboardContent = {
          title: args.title || "思维导图",
          content: "",
          type: "mindmap",
          mindMapData: {
            title: args.title || "思维导图",
            nodes: args.nodes || [],
            connections: args.connections || []
          },
          timestamp: Date.now(),
        };
        
        // Add new slide to history
        setSlides(prevSlides => [...prevSlides, newMindMapContent]);
        break;

      default:
        console.log("Unknown tool call:", name);
        break;
    }
  }, [toolCall]);

  // Auto-navigate to the latest slide when new content is added
  useEffect(() => {
    if (slides.length > 0) {
      setCurrentSlideIndex(slides.length - 1);
    }
  }, [slides.length]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (slides.length <= 1) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousSlide();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextSlide();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlideIndex, slides.length]);

  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handleSlideSelect = (index: number) => {
    setCurrentSlideIndex(index);
  };

  const renderChart = (chartData: any) => {
    if (!chartData || !chartData.data) return null;

    const data = {
      labels: chartData.data.map((item: any) => item.label),
      datasets: [
        {
          data: chartData.data.map((item: any) => item.value),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
          borderColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: "#333",
          },
        },
        title: {
          display: false,
        },
      },
      scales: chartData.chartType !== "pie" ? {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#333",
          },
        },
        x: {
          ticks: {
            color: "#333",
          },
        },
      } : {},
    };

    switch (chartData.chartType) {
      case "bar":
        return <Bar data={data} options={options} />;
      case "pie":
        return <Pie data={data} options={options} />;
      case "line":
        return <Line data={data} options={options} />;
      default:
        return null;
    }
  };

  const renderNavigationControls = () => {
    const isEmpty = slides.length === 0;

    return (
      <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg shadow-md p-2 border border-slate-600 mb-3">
        <button
          onClick={handlePreviousSlide}
          disabled={isEmpty || currentSlideIndex <= 0}
          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-xs font-semibold shadow-sm transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          title="Previous slide"
        >
          ‹ Previous
        </button>
        
        {isEmpty ? (
          <div className="px-3 py-1.5 bg-slate-700 text-slate-400 border border-slate-500 rounded-md text-xs min-w-[180px] font-medium text-center">
            No slides yet
          </div>
        ) : (
          <select
            value={currentSlideIndex}
            onChange={(e) => handleSlideSelect(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-700 text-white border border-slate-500 rounded-md text-xs min-w-[180px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {slides.map((slide, index) => (
              <option key={index} value={index}>
                {index + 1}. {slide.title.substring(0, 30)}{slide.title.length > 30 ? '...' : ''}
              </option>
            ))}
          </select>
        )}
        
        <button
          onClick={handleNextSlide}
          disabled={isEmpty || currentSlideIndex >= slides.length - 1}
          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-xs font-semibold shadow-sm transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          title="Next slide"
        >
          Next ›
        </button>
        
        <div className="text-xs text-slate-200 ml-2 font-semibold bg-slate-600 px-3 py-1.5 rounded-md">
          {isEmpty ? "0 / 0" : `${currentSlideIndex + 1} / ${slides.length}`}
        </div>
      </div>
    );
  };

  // Enhanced highlighting function for better automatic highlighting
  const enhanceTextWithHighlights = (text: string) => {
    if (!text) return text;
    
    // If there's a specific highlighted text, use that
    if (highlightedText) {
      const parts = text.split(new RegExp(`(${highlightedText})`, 'gi'));
      return parts.map((part, index) => 
        part.toLowerCase() === highlightedText.toLowerCase() ? 
          <mark key={index} className="bg-yellow-300 px-1 rounded">{part}</mark> : 
          part
      );
    }

    return text;
  };

  // Detect if content is markdown
  const isMarkdownContent = (text: string) => {
    const markdownPatterns = [
      /#{1,6}\s+/,           // Headers
      /\*\*.*\*\*/,          // Bold
      /\*.*\*/,              // Italic
      /```[\s\S]*?```/,      // Code blocks
      /`[^`]+`/,             // Inline code
      /\[.*\]\(.*\)/,        // Links
      /^\s*[-*+]\s+/m,       // Unordered lists
      /^\s*\d+\.\s+/m,       // Ordered lists
      /^\s*>\s+/m,           // Blockquotes
      /\|.*\|/,              // Tables
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  const renderContent = () => {
    if (!content) {
      return (
        <div className="size-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="text-center max-w-2xl px-8">
            <div className="text-7xl mb-6">👩‍🏫</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Ask me anything!
            </div>
            <div className="text-sm mt-4 text-gray-700 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200">
              <span className="font-bold text-lg text-blue-600 block mb-3">📋 Quick Start Guide</span>
              <ol className="list-decimal list-inside mt-2 space-y-2 text-left">
                <li className="leading-relaxed">Click the <span className="font-semibold text-blue-600">WiFi button</span> in the top-right corner and wait for it to turn <span className="text-green-600 font-semibold">green</span> before starting. <span className="text-xs text-gray-500 block ml-5 mt-1">(You can also use the text input in quiet environments)</span></li>
                <li className="leading-relaxed">The whiteboard will automatically display relevant information based on your conversation. Use the navigation bar at the top to review previous content.</li>
                <li className="leading-relaxed">When finished, click the WiFi button again to disconnect.</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    if (content.type === "mindmap") {
      return <MindMap mindMapData={content.mindMapData || null} />;
    }

    if (content.type === "images") {
      const imageCount = content.images?.length || 0;
      
      return (
        <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
          {/* Header */}
          <div className="text-center mb-4 bg-white/60 backdrop-blur-sm rounded-lg py-3 px-4 shadow-sm">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{content.title}</h2>
            {content.content && (
              <div className="text-gray-700 text-sm mt-2 font-medium">
                {content.content}
              </div>
            )}
          </div>
          
          {/* Images Layout */}
          <div className="h-[calc(100%-80px)] overflow-hidden">
            {imageCount === 1 && content.images && (
              // Single image - centered
              <div className="h-full flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 max-w-2xl max-h-full">
                  <div className="h-[85%] bg-gradient-to-br from-gray-50 to-gray-100 relative">
                    <Image 
                      src={content.images[0].url} 
                      alt={content.images[0].description}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-4xl mb-2">🖼️</div><div class="text-sm">Image unavailable</div></div></div>';
                        }
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-gray-800 text-sm">
                      {content.images[0].description}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Source: {content.images[0].chapter}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {imageCount === 2 && content.images && (
              // Two images - side by side
              <div className="h-full flex gap-4">
                {content.images.slice(0, 2).map((image, index) => (
                  <div key={index} className="flex-1 bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100 relative">
                      <Image 
                        src={image.url} 
                        alt={image.description}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-3xl mb-2">🖼️</div><div class="text-sm">Image unavailable</div></div></div>';
                          }
                        }}
                      />
                    </div>
                    <div className="h-[15%] p-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-800 text-xs line-clamp-1">
                        {image.description}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Source: {image.chapter}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {imageCount >= 3 && content.images && (
              // Multiple images - grid layout
              <div className="h-full">
                {imageCount === 3 && (
                  <div className="h-full flex flex-col gap-2">
                    <div className="flex-1 flex gap-2">
                      {content.images.slice(0, 2).map((image, index) => (
                        <div key={index} className="flex-1 bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl">🖼️</div></div></div>';
                                }
                              }}
                            />
                          </div>
                          <div className="h-[20%] p-1 flex items-center">
                            <div className="font-medium text-gray-800 text-xs line-clamp-1">
                              {image.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={content.images[2].url} 
                            alt={content.images[2].description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl">🖼️</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex items-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {content.images[2].description}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {imageCount >= 4 && content.images && (
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-xl">🖼️</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex items-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {image.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (content.type === "chart") {
      const hasImages = content.images && content.images.length > 0;
      const imageCount = content.images?.length || 0;
      
      return (
        <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
          {/* Header */}
          <div className="text-center mb-4 bg-white/60 backdrop-blur-sm rounded-lg py-3 px-4 shadow-sm">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{content.title}</h2>
            {content.content && (
              <div className="text-gray-700 text-sm mt-2 font-medium">
                {content.content}
              </div>
            )}
          </div>
          
          {/* Chart + Images Layout */}
          <div className="h-[calc(100%-80px)] overflow-hidden">
            {!hasImages ? (
              // Chart only - centered
              <div className="h-full flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full border border-gray-200">
                  {renderChart(content.chart)}
                </div>
              </div>
            ) : (
              // Chart with images - side by side
              <div className="flex h-full gap-4">
                {/* Left: Chart (60%) */}
                <div className="flex-[3] bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 p-6">
                  <div className="h-full flex items-center justify-center">
                    {renderChart(content.chart)}
                  </div>
                </div>
                
                {/* Right: Images (40%) */}
                <div className="flex-[2] overflow-hidden">
                  {imageCount === 1 && content.images && (
                    <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                      <div className="h-[85%] bg-gray-100 relative">
                        <Image 
                          src={content.images[0].url} 
                          alt={content.images[0].description}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                          className="object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-3xl mb-2">🖼️</div><div class="text-sm">Image unavailable</div></div></div>';
                            }
                          }}
                        />
                      </div>
                      <div className="h-[15%] p-2 flex flex-col justify-center">
                        <div className="font-medium text-gray-800 text-xs line-clamp-1">
                          {content.images[0].description}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Source: {content.images[0].chapter}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {imageCount === 2 && content.images && (
                    <div className="h-full space-y-2">
                      {content.images.slice(0, 2).map((image, index) => (
                        <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl mb-1">🖼️</div><div class="text-xs">Unavailable</div></div></div>';
                                }
                              }}
                            />
                          </div>
                          <div className="h-[20%] p-1 flex flex-col justify-center">
                            <div className="font-medium text-gray-800 text-xs line-clamp-1">
                              {image.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {imageCount >= 3 && content.images && (
                    <div className="h-full grid grid-cols-2 gap-2">
                      {content.images.slice(0, 4).map((image, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-xl">🖼️</div></div></div>';
                                }
                              }}
                            />
                          </div>
                          <div className="h-[20%] p-1 flex items-center">
                            <div className="font-medium text-gray-800 text-xs line-clamp-1">
                              {image.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (content.type === "list") {
      const hasImages = content.images && content.images.length > 0;
      
      // Parse items from content.content if items array is missing
      let itemsToShow = content.items;
      if (!itemsToShow || itemsToShow.length === 0) {
        if (content.content) {
          itemsToShow = content.content.split('\n').filter(line => line.trim().match(/^\d+\./)).map(line => line.trim());
        }
      }
      
      const itemCount = itemsToShow?.length || 0;
      const imageCount = content.images?.length || 0;
      
      // Stable layout decision: Use side-by-side if we have both content and images
      const useSideBySide = hasImages && itemCount > 0 && itemCount <= 6;
      
      if (useSideBySide) {
        return (
          <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
            {/* Header */}
            <div className="text-center mb-4 bg-white/60 backdrop-blur-sm rounded-lg py-3 px-4 shadow-sm">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{content.title}</h2>
            </div>
            
            {/* Side-by-side layout */}
            <div className="flex h-[calc(100%-60px)] gap-4">
              {/* Left: Content (60%) */}
              <div className="flex-[3] space-y-2 overflow-hidden">
                {itemsToShow?.slice(0, 6).map((item, index) => {
                  const isHighlighted = highlightedText && item.toLowerCase().includes(highlightedText.toLowerCase());
                  return (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg bg-white shadow-md border-l-4 transition-all duration-300 ${
                        isHighlighted ? 'border-yellow-400 bg-yellow-50 shadow-lg' : 'border-blue-500 hover:shadow-lg hover:border-blue-600'
                      }`}
                    >
                      <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                        {index + 1}
                      </div>
                      <div className="text-xs leading-relaxed text-gray-800 flex-1">
                        {isMarkdownContent(item) ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            components={{
                              ol: ({node, ...props}) => <span {...props as any} />,
                              li: ({node, ...props}) => <span {...props as any} />,
                              p: ({node, ...props}) => <span className="inline" {...props as any} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                              em: ({node, ...props}) => <em className="italic text-blue-700" {...props} />,
                            }}
                          >
                            {item.replace(/^\d+\.\s*/, '')}
                          </ReactMarkdown>
                        ) : (
                          enhanceTextWithHighlights(item)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Right: Images (40%) */}
              <div className="flex-[2] overflow-hidden">
                {imageCount === 1 && (
                  // Single image - full height
                  content.images && (
                  <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100 relative">
                      <Image 
                        src={content.images[0].url} 
                        alt={content.images[0].description}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-3xl mb-2">🖼️</div><div class="text-sm">Image unavailable</div></div></div>';
                          }
                        }}
                      />
                    </div>
                    <div className="h-[15%] p-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-800 text-xs line-clamp-1">
                        {content.images[0].description}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Source: {content.images[0].chapter}
                      </div>
                    </div>
                  </div>
                  )
                )}
                
                {imageCount === 2 && content.images && (
                  // Two images - stacked vertically
                  <div className="h-full space-y-2">
                    {content.images.slice(0, 2).map((image, index) => (
                      <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl mb-1">🖼️</div><div class="text-xs">Unavailable</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex flex-col justify-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {image.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {imageCount >= 3 && content.images && (
                  // Multiple images - 2x2 grid
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-xl">🖼️</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex items-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {image.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      
      // Fallback: Single column layout
      return (
        <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="text-center mb-4 bg-white/60 backdrop-blur-sm rounded-lg py-3 px-4 shadow-sm">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{content.title}</h2>
          </div>
          
          <div className="h-[calc(100%-60px)] overflow-hidden">
            <div className="space-y-2 mb-4">
              {itemsToShow?.slice(0, 8).map((item, index) => {
                const isHighlighted = highlightedText && item.toLowerCase().includes(highlightedText.toLowerCase());
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg bg-white shadow-md border-l-4 transition-all duration-300 ${
                      isHighlighted ? 'border-yellow-400 bg-yellow-50 shadow-lg' : 'border-blue-500 hover:shadow-lg hover:border-blue-600'
                    }`}
                  >
                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                      {index + 1}
                    </div>
                    <div className="text-xs leading-relaxed text-gray-800 flex-1">
                      {isMarkdownContent(item) ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          components={{
                            ol: ({node, ...props}) => <span {...props as any} />,
                            li: ({node, ...props}) => <span {...props as any} />,
                            p: ({node, ...props}) => <span className="inline" {...props as any} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-blue-700" {...props} />,
                          }}
                        >
                          {item.replace(/^\d+\.\s*/, '')}
                        </ReactMarkdown>
                      ) : (
                        enhanceTextWithHighlights(item)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Images at bottom for single column */}
            {hasImages && content.images && (
              <div className="grid grid-cols-3 gap-2">
                {content.images.slice(0, 3).map((image, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                    <div className="aspect-video bg-gray-100 relative">
                      <Image 
                        src={image.url} 
                        alt={image.description}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                      />
                    </div>
                    <div className="p-1">
                      <div className="font-medium text-gray-800 text-xs line-clamp-1">
                        {image.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default handler for "text" and "diagram" types
    const hasImages = content.images && content.images.length > 0;
    const imageCount = content.images?.length || 0;
    
    return (
      <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
        {/* Header */}
        <div className="text-center mb-4 bg-white/60 backdrop-blur-sm rounded-lg py-3 px-4 shadow-sm">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{content.title}</h2>
        </div>
        
        {/* Content Layout */}
        <div className="h-[calc(100%-60px)] overflow-hidden">
          {!hasImages ? (
            // Text only - centered content area
            <div className="h-full flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full max-h-full overflow-y-auto border border-gray-200">
                <div className="text-sm leading-relaxed text-gray-800">
                  {isMarkdownContent(content.content) ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold text-blue-900 mt-4 mb-3 border-b border-gray-300 pb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-base font-semibold text-blue-900 mt-4 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-blue-900 mt-3 mb-2" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-sm" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 ml-3 text-sm" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-3 text-sm" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed text-sm" {...props} />,
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 italic text-gray-700 mb-3 text-sm" {...props} />
                          ),
                          code: ({node, children, className, ...props}) => {
                            const isInline = !className || !className.includes('language-');
                            return isInline ? (
                              <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                            ) : (
                              <code className="block bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto" {...props} />
                            );
                          },
                          pre: ({node, ...props}) => (
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto mb-3 text-xs" {...props} />
                          ),
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto mb-3">
                              <table className="min-w-full border-collapse border border-gray-300 text-xs" {...props} />
                            </div>
                          ),
                          th: ({node, ...props}) => (
                            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-xs" {...props} />
                          ),
                          td: ({node, ...props}) => (
                            <td className="border border-gray-300 px-2 py-1 text-xs" {...props} />
                          ),
                          a: ({node, ...props}) => (
                            <a className="text-blue-600 hover:text-blue-800 underline text-sm" target="_blank" rel="noopener noreferrer" {...props} />
                          ),
                          strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                          em: ({node, ...props}) => <em className="italic text-blue-700" {...props} />,
                        }}
                      >
                        {content.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {enhanceTextWithHighlights(content.content)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Text with images - side by side
            <div className="flex h-full gap-4">
              {/* Left: Text content (60%) */}
              <div className="flex-[3] bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 p-6">
                <div className="h-full overflow-y-auto">
                  <div className="text-xs leading-relaxed text-gray-800">
                    {isMarkdownContent(content.content) ? (
                      <div className="prose prose-xs max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeRaw]}
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-sm font-bold text-blue-900 mt-3 mb-2 border-b border-gray-300 pb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xs font-semibold text-blue-900 mt-3 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-blue-900 mt-2 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-xs" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2 text-xs" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2 text-xs" {...props} />,
                            li: ({node, ...props}) => <li className="leading-relaxed text-xs" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-blue-700" {...props} />,
                          }}
                        >
                          {content.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-xs">
                        {enhanceTextWithHighlights(content.content)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right: Images (40%) */}
              <div className="flex-[2] overflow-hidden">
                {imageCount === 1 && content.images && (
                  <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100 relative">
                      <Image 
                        src={content.images[0].url} 
                        alt={content.images[0].description}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-3xl mb-2">🖼️</div><div class="text-sm">Image unavailable</div></div></div>';
                          }
                        }}
                      />
                    </div>
                    <div className="h-[15%] p-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-800 text-xs line-clamp-1">
                        {content.images[0].description}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Source: {content.images[0].chapter}
                      </div>
                    </div>
                  </div>
                )}
                
                {imageCount === 2 && content.images && (
                  <div className="h-full space-y-2">
                    {content.images.slice(0, 2).map((image, index) => (
                      <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl mb-1">🖼️</div><div class="text-xs">Unavailable</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex flex-col justify-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {image.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {imageCount >= 3 && content.images && (
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                        <div className="h-[80%] bg-gray-100 relative">
                          <Image 
                            src={image.url} 
                            alt={image.description}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-xl">🖼️</div></div></div>';
                              }
                            }}
                          />
                        </div>
                        <div className="h-[20%] p-1 flex items-center">
                          <div className="font-medium text-gray-800 text-xs line-clamp-1">
                            {image.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-300 via-gray-200 to-slate-300 flex flex-col items-center justify-center p-8">
      {renderNavigationControls()}
      <div className="w-[850px] h-[480px] bg-gray-100 border-2 border-gray-300 rounded-2xl shadow-2xl overflow-hidden ring-4 ring-gray-300/50 mt-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default Whiteboard; 