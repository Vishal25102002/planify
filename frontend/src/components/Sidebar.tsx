import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { PiPlant, PiChats } from 'react-icons/pi';
import { HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from 'react-icons/hi';
import { BiUser } from 'react-icons/bi';
import { Message } from './Dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import planifylogo from "../assets/planify.png"

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: number | null;
  onNewConversation: () => void;
  onSelectConversation: (id: number) => void;
  isMobileOpen: boolean;
  isMobile: boolean;
  onCollapseToggle: () => void;
}

function Sidebar({
  conversations,
  activeId,
  onNewConversation,
  onSelectConversation,
  isMobileOpen,
  isMobile,
  onCollapseToggle
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const getLastMessage = (messages: Message[]) => {
    if (messages.length === 0) return 'No messages yet';
    const lastMessage = messages[messages.length - 1];
    return lastMessage.text.length > 30
      ? lastMessage.text.substring(0, 30) + '...'
      : lastMessage.text;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={false}
      animate={{
        x: isMobile ? (isMobileOpen ? 0 : -300) : 0,
        width: isMobile ? 300 : isCollapsed ? 100 : 300
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed lg:relative z-50 flex flex-col h-screen overflow-hidden bg-white
        ${isMobile ? 'shadow-xl' : ''}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
        <motion.div className="flex items-center" whileHover={{ scale: 1.05 }}>
          <div className={`${isCollapsed ? 'mx-auto' : ''} flex items-center justify-center`}>
            <img src={planifylogo} alt="Logo" className="h-16 w-16 mix-blend-multiply" />
          </div>
          <AnimatePresence>
            {(!isCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="ml-3"
              >
                {/* Remove the heading and paragraph */}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Minimize/Expand Button */}
        {!isMobile && (
          <motion.button
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              onCollapseToggle();
            }}
            className="p-2 rounded-full hover:bg-emerald-50 transition-colors relative bg-transparent"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-emerald-400 to-teal-400 text-white rounded-full">
              {isCollapsed ? (
                <HiOutlineChevronDoubleRight className="w-4 h-4" />
              ) : (
                <HiOutlineChevronDoubleLeft className="w-4 h-4" />
              )}
            </div>
          </motion.button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <motion.button
          onClick={onNewConversation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:opacity-90 flex items-center justify-center shadow-sm ${
            isCollapsed ? 'w-12 h-12' : 'w-full h-11'
          }`}
        >
          <FiPlus className={`text-white ${isCollapsed ? 'text-xl' : 'text-lg'}`} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-2 text-sm font-medium"
              >
                New Chat
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent px-3 py-2">
        {conversations.length === 0 && !isCollapsed && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <PiChats className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No conversations yet. Start a new one!</p>
          </div>
        )}
        <AnimatePresence>
          {conversations
            .slice()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((conv) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 mb-2 rounded-xl cursor-pointer transition-all hover:shadow-sm w-full text-left ${
                  conv.id === activeId
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100/50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-emerald-800">
                      {conv.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
                      <div className="flex items-center text-xs text-gray-400 mt-0.5">
                        <BiUser className="w-3 h-3 mr-1" />
                        <p className="truncate">{getLastMessage(conv.messages)}</p>
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDate(conv.createdAt)}
                  </span>
                </div>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <PiPlant className="text-emerald-600 w-5 h-5" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-2 text-xs text-gray-600 font-medium"
              >
                Powered by Plantiy AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default Sidebar;