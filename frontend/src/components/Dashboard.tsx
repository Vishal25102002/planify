import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Chatbot from './Chatbot';

export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  references?: {
    content: string;
    page: number;
    score: string;
  }[];
}

export interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * The active conversation is whichever one has an ID matching activeConversationId.
   */
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  /**
   * Create a new, empty conversation, then set it as active.
   */
  const handleNewConversation = () => {
    // Pick an ID that’s 1 higher than the highest existing conversation
    const newId = conversations.length ? Math.max(...conversations.map((c) => c.id)) + 1 : 1;
    const newConv: Conversation = {
      id: newId,
      title: `New Chat ${newId}`,
      messages: [],
      createdAt: new Date()
    };
    setConversations((prev) => [...prev, newConv]);
    setActiveConversationId(newId);
    if (isMobile) setIsMobileSidebarOpen(false);
  };

  /**
   * Switch to an existing conversation
   */
  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    if (isMobile) setIsMobileSidebarOpen(false);
  };

  /**
   * Add a new message (user or bot) to the active conversation.
   * If there is no active conversation yet, automatically create one.
   */
  const handleAddMessageToActive = (msg: Message) => {
    setConversations((prev) => {
      // If no active conversation ID is set yet...
      if (!activeConversationId) {
        // If there are no existing conversations, create the very first one
        if (prev.length === 0) {
          const newConv: Conversation = {
            id: 1,
            title: msg.isBot
              ? 'Bot'
              : msg.text.slice(0, 30) + (msg.text.length > 30 ? '...' : ''),
            messages: [msg],
            createdAt: new Date()
          };
          setActiveConversationId(1);
          return [newConv];
        } else {
          // Otherwise, use the first existing conversation as active
          const firstConv = prev[0];
          setActiveConversationId(firstConv.id);
          return prev.map((conv) => {
            if (conv.id === firstConv.id) {
              return {
                ...conv,
                messages: [...conv.messages, msg],
                // Update the title if it’s still the default “New Chat” and the new message is from user
                title:
                  conv.title.startsWith('New Chat') && !msg.isBot
                    ? msg.text.slice(0, 30) + (msg.text.length > 30 ? '...' : '')
                    : conv.title
              };
            }
            return conv;
          });
        }
      } else {
        // We have an active conversation ID, so just append the new message
        return prev.map((conv) => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, msg],
              // If it’s still “New Chat” and the user message arrives, update title
              title:
                conv.title.startsWith('New Chat') && !msg.isBot
                  ? msg.text.slice(0, 30) + (msg.text.length > 30 ? '...' : '')
                  : conv.title
            };
          }
          return conv;
        });
      }
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Dim overlay for mobile sidebar */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        isMobileOpen={isMobileSidebarOpen}
        isMobile={isMobile}
        onCollapseToggle={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 h-full">
        <Chatbot
          messages={activeConversation?.messages || []}
          onAddMessage={handleAddMessageToActive}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}

export default Dashboard;
