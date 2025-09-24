"use client";

import React, { useEffect, useState } from "react";
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
  type: "text" | "chart" | "diagram" | "list" | "images";
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
      args = JSON.parse(toolArgs);
      console.log("Parsed arguments:", args);
    } catch (error) {
      console.error("Failed to parse toolCall arguments:", error);
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
    const isHidden = slides.length === 0;

    return (
      <div className={`flex items-center justify-center space-x-2 bg-white rounded-lg shadow-md p-3 border mb-4 ${isHidden ? 'invisible' : ''}`}>
        <button
          onClick={handlePreviousSlide}
          disabled={currentSlideIndex <= 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          title="Previous slide"
        >
          ‹ Previous
        </button>
        
        <select
          value={currentSlideIndex}
          onChange={(e) => handleSlideSelect(Number(e.target.value))}
          className="px-3 py-2 border rounded text-sm min-w-[200px]"
        >
          {slides.map((slide, index) => (
            <option key={index} value={index}>
              {index + 1}. {slide.title.substring(0, 30)}{slide.title.length > 30 ? '...' : ''}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleNextSlide}
          disabled={currentSlideIndex >= slides.length - 1}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          title="Next slide"
        >
          Next ›
        </button>
        
        <div className="text-sm text-gray-600 ml-4 font-medium">
          {currentSlideIndex + 1} / {slides.length}
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

  const renderImages = (images: any[]) => {
    if (!images || images.length === 0) return null;
    
    return (
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
                <img 
                  src={image.url} 
                  alt={image.description}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-2xl mb-2">🖼️</div><div class="text-sm">图片加载失败</div></div></div>';
                    }
                  }}
                />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800 mb-1 line-clamp-2">
                  {image.description}
                </div>
                <div className="text-gray-500 text-xs">
                  来源：{image.chapter}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!content) {
      return (
        <div className="size-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <div className="text-xl">白板准备就绪</div>
            <div className="text-sm mt-2">等待内容显示...</div>
          </div>
        </div>
      );
    }

    if (content.type === "images") {
      const imageCount = content.images?.length || 0;
      
      return (
        <div className="h-full w-full bg-gradient-to-br from-blue-50 to-white p-4">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-blue-900">{content.title}</h2>
            {content.content && (
              <div className="text-gray-600 text-sm mt-2">
                {content.content}
              </div>
            )}
          </div>
          
          {/* Images Layout */}
          <div className="h-[calc(100%-80px)] overflow-hidden">
            {imageCount === 1 && (
              // Single image - centered
              <div className="h-full flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md overflow-hidden border max-w-2xl max-h-full">
                  <div className="h-[85%] bg-gray-100">
                    <img 
                      src={content.images[0].url} 
                      alt={content.images[0].description}
                      className="w-full h-full object-contain"
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
            
            {imageCount === 2 && (
              // Two images - side by side
              <div className="h-full flex gap-4">
                {content.images.slice(0, 2).map((image, index) => (
                  <div key={index} className="flex-1 bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100">
                      <img 
                        src={image.url} 
                        alt={image.description}
                        className="w-full h-full object-contain"
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
            
            {imageCount >= 3 && (
              // Multiple images - grid layout
              <div className="h-full">
                {imageCount === 3 && (
                  <div className="h-full flex flex-col gap-2">
                    <div className="flex-1 flex gap-2">
                      {content.images.slice(0, 2).map((image, index) => (
                        <div key={index} className="flex-1 bg-white rounded-lg shadow-md overflow-hidden border">
                          <div className="h-[80%] bg-gray-100">
                            <img 
                              src={image.url} 
                              alt={image.description}
                              className="w-full h-full object-contain"
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
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={content.images[2].url} 
                            alt={content.images[2].description}
                            className="w-full h-full object-contain"
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
                
                {imageCount >= 4 && (
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={image.url} 
                            alt={image.description}
                            className="w-full h-full object-contain"
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
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-blue-900">{content.title}</h2>
            {content.content && (
              <div className="text-gray-600 text-sm mt-2">
                {content.content}
              </div>
            )}
          </div>
          
          {/* Chart + Images Layout */}
          <div className="h-[calc(100%-80px)] overflow-hidden">
            {!hasImages ? (
              // Chart only - centered
              <div className="h-full flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl w-full">
                  {renderChart(content.chart)}
                </div>
              </div>
            ) : (
              // Chart with images - side by side
              <div className="flex h-full gap-4">
                {/* Left: Chart (60%) */}
                <div className="flex-[3] bg-white rounded-lg shadow-md overflow-hidden border p-4">
                  <div className="h-full flex items-center justify-center">
                    {renderChart(content.chart)}
                  </div>
                </div>
                
                {/* Right: Images (40%) */}
                <div className="flex-[2] overflow-hidden">
                  {imageCount === 1 && (
                    <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                      <div className="h-[85%] bg-gray-100">
                        <img 
                          src={content.images[0].url} 
                          alt={content.images[0].description}
                          className="w-full h-full object-contain"
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
                  
                  {imageCount === 2 && (
                    <div className="h-full space-y-2">
                      {content.images.slice(0, 2).map((image, index) => (
                        <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                          <div className="h-[80%] bg-gray-100">
                            <img 
                              src={image.url} 
                              alt={image.description}
                              className="w-full h-full object-contain"
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
                  
                  {imageCount >= 3 && (
                    <div className="h-full grid grid-cols-2 gap-2">
                      {content.images.slice(0, 4).map((image, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                          <div className="h-[80%] bg-gray-100">
                            <img 
                              src={image.url} 
                              alt={image.description}
                              className="w-full h-full object-contain"
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
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-blue-900">{content.title}</h2>
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
                      className={`flex items-start space-x-2 p-2 rounded-lg bg-white shadow-sm border-l-4 transition-all duration-300 ${
                        isHighlighted ? 'border-yellow-400 bg-yellow-50' : 'border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                      <div className="text-xs leading-relaxed text-gray-800 flex-1">
                        {isMarkdownContent(item) ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              ol: ({node, ...props}) => <div {...props} />,
                              li: ({node, ...props}) => <div {...props} />,
                              p: ({node, ...props}) => <div className="inline" {...props} />,
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
                  <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100">
                      <img 
                        src={content.images[0].url} 
                        alt={content.images[0].description}
                        className="w-full h-full object-contain"
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
                
                {imageCount === 2 && (
                  // Two images - stacked vertically
                  <div className="h-full space-y-2">
                    {content.images.slice(0, 2).map((image, index) => (
                      <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={image.url} 
                            alt={image.description}
                            className="w-full h-full object-contain"
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
                
                {imageCount >= 3 && (
                  // Multiple images - 2x2 grid
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={image.url} 
                            alt={image.description}
                            className="w-full h-full object-contain"
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
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-blue-900">{content.title}</h2>
          </div>
          
          <div className="h-[calc(100%-60px)] overflow-hidden">
            <div className="space-y-2 mb-4">
              {itemsToShow?.slice(0, 8).map((item, index) => {
                const isHighlighted = highlightedText && item.toLowerCase().includes(highlightedText.toLowerCase());
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-2 p-2 rounded-lg bg-white shadow-sm border-l-4 transition-all duration-300 ${
                      isHighlighted ? 'border-yellow-400 bg-yellow-50' : 'border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </div>
                    <div className="text-xs leading-relaxed text-gray-800 flex-1">
                      {isMarkdownContent(item) ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            ol: ({node, ...props}) => <div {...props} />,
                            li: ({node, ...props}) => <div {...props} />,
                            p: ({node, ...props}) => <div className="inline" {...props} />,
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
            {hasImages && (
              <div className="grid grid-cols-3 gap-2">
                {content.images.slice(0, 3).map((image, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                    <div className="aspect-video bg-gray-100">
                      <img 
                        src={image.url} 
                        alt={image.description}
                        className="w-full h-full object-contain"
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
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-blue-900">{content.title}</h2>
        </div>
        
        {/* Content Layout */}
        <div className="h-[calc(100%-60px)] overflow-hidden">
          {!hasImages ? (
            // Text only - centered content area
            <div className="h-full flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl w-full max-h-full overflow-y-auto">
                <div className="text-sm leading-relaxed text-gray-800">
                  {isMarkdownContent(content.content) ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
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
                          code: ({node, ...props}) => {
                            const { children, className } = props;
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
              <div className="flex-[3] bg-white rounded-lg shadow-md overflow-hidden border p-4">
                <div className="h-full overflow-y-auto">
                  <div className="text-xs leading-relaxed text-gray-800">
                    {isMarkdownContent(content.content) ? (
                      <div className="prose prose-xs max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeRaw]}
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
                {imageCount === 1 && (
                  <div className="h-full bg-white rounded-lg shadow-md overflow-hidden border">
                    <div className="h-[85%] bg-gray-100">
                      <img 
                        src={content.images[0].url} 
                        alt={content.images[0].description}
                        className="w-full h-full object-contain"
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
                
                {imageCount === 2 && (
                  <div className="h-full space-y-2">
                    {content.images.slice(0, 2).map((image, index) => (
                      <div key={index} className="h-[48%] bg-white rounded-lg shadow-md overflow-hidden border">
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={image.url} 
                            alt={image.description}
                            className="w-full h-full object-contain"
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
                
                {imageCount >= 3 && (
                  <div className="h-full grid grid-cols-2 gap-2">
                    {content.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                        <div className="h-[80%] bg-gray-100">
                          <img 
                            src={image.url} 
                            alt={image.description}
                            className="w-full h-full object-contain"
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
    <div className="size-full bg-gray-50 flex flex-col items-center justify-center p-8">
      {renderNavigationControls()}
      <div className="w-[800px] h-[450px] bg-white border-2 border-gray-200 rounded-lg shadow-lg">
        {renderContent()}
      </div>
    </div>
  );
};

export default Whiteboard; 