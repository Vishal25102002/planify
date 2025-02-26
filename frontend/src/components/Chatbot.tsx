import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiMenu } from 'react-icons/fi';
import { RiPlantLine, RiUserSmileLine } from 'react-icons/ri';
import { AiOutlineRobot } from 'react-icons/ai';
import { FiUser } from 'react-icons/fi';
import axios from 'axios';
import { Message } from './Dashboard';

interface ChatbotProps {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

function Chatbot({ messages, onAddMessage, onToggleSidebar, isMobile }: ChatbotProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isNewChat = messages.length === 0;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    };

    onAddMessage(userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post<{ answer: string; references: any[] }>(
        'http://127.0.0.1:5000/ask',
        { question: inputMessage },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        isBot: true,
        timestamp: new Date(),
        references: response.data.references
      };

      onAddMessage(botMessage);
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, something went wrong. Please try again.',
        isBot: true,
        timestamp: new Date()
      };
      onAddMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const renderMessageContent = (message: Message) => (
    <div
      className={`max-w-[90%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
        message.isBot
          ? 'bg-white border border-gray-100 text-gray-800'
          : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
      }`}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>

      {message.references && message.references.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-emerald-600 mb-1">References:</p>
          {message.references.map((ref, index) => (
            <div key={index} className="text-xs text-gray-500 mb-1">
              <p className="whitespace-pre-wrap break-words">{ref.content}</p>
              <span className="text-xs text-gray-400">
                Page {ref.page} • Score: {ref.score}
              </span>
            </div>
          ))}
        </div>
      )}

      <span className="text-xs opacity-70 mt-2 block">
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {isMobile && (
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between lg:hidden">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center">
              <RiPlantLine className="text-white text-lg" />
            </div>
            <span className="font-medium text-gray-800">Plantify</span>
          </div>
          <div className="w-10" />
        </div>
      )}

      {isNewChat ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full px-2">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg mb-4">
                <RiPlantLine className="text-white text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Planify</h2>
              <p className="text-gray-600">
                Your personal Council assistant. Ask me anything about Hackney!
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about Council..."
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                <FiSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start space-x-3 px-2 ${
                  message.isBot ? 'justify-start' : 'flex-row-reverse space-x-reverse'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.isBot
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : 'bg-gradient-to-r from-blue-400 to-indigo-400'
                  }`}
                >
                  {message.isBot ? (
                    <AiOutlineRobot className="text-white text-lg" />
                  ) : (
                    <FiUser className="text-white text-lg" />
                  )}
                </div>
                {renderMessageContent(message)}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start space-x-3 px-2"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center">
                  <RiPlantLine className="text-white text-lg" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.2, 1],
                          backgroundColor: ['#34d399', '#10b981', '#34d399']
                        }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                        className="w-2 h-2 rounded-full bg-emerald-400"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="max-w-4xl mx-auto flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all pr-12"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Chatbot;
