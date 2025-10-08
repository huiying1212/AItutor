import React, { useState } from "react";
import { CodeXml, SidebarClose } from "lucide-react";

interface LogsProps {
  messages: any[];
}

const Logs: React.FC<LogsProps> = ({ messages }) => {
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const toggleConsole = () => {
    setIsConsoleOpen(!isConsoleOpen);
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <div
        onClick={toggleConsole}
        className="cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-full p-3 flex items-center justify-center shadow-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 transform hover:scale-105 ring-2 ring-slate-600/50"
      >
        <CodeXml size={24} />
      </div>
      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-mono text-white transform shadow-2xl ${
          isConsoleOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out border-r-2 border-slate-700`}
        style={{ width: "380px" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Debug Logs</h2>
            <SidebarClose 
              onClick={toggleConsole} 
              className="cursor-pointer hover:text-blue-400 transition-colors duration-200"
            />
          </div>
          <div className="h-[88vh] overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            <pre className="text-xs">
              {messages.map((message, index) => (
                <div key={index} className="mb-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-blue-500/50 transition-colors duration-200">
                  <pre className="text-slate-300">{JSON.stringify(message, null, 2)}</pre>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
