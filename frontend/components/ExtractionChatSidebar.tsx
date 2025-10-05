'use client';

import { useState, useEffect, useRef } from 'react';
import { ReceiptUploadResponse } from '@/lib/types';
import { receiptApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExtractionChatSidebarProps {
  uploadData: ReceiptUploadResponse;
  onReprocess: (newData: ReceiptUploadResponse) => void;
}

export default function ExtractionChatSidebar({
  uploadData,
  onReprocess,
}: ExtractionChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with initial extraction or load from localStorage
  useEffect(() => {
    const chatKey = `chat_${uploadData.receipt_id}`;
    const savedChat = localStorage.getItem(chatKey);

    if (savedChat) {
      // Load persisted chat
      try {
        const parsedMessages = JSON.parse(savedChat);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Failed to parse saved chat:', error);
        // Fall back to initial messages
        initializeChat();
      }
    } else {
      // Initialize new chat
      initializeChat();
    }

    function initializeChat() {
      const initialMessages: ChatMessage[] = [
        {
          id: 'initial-system',
          type: 'system',
          content: `Initial extraction completed with ${((uploadData.confidence || 0.85) * 100).toFixed(0)}% confidence`,
          timestamp: new Date(),
        },
      ];

      // Add initial prompt if available
      if (uploadData.extraction_log.prompt) {
        initialMessages.push({
          id: 'initial-prompt',
          type: 'assistant',
          content: `📋 Prompt sent to Gemini:\n${uploadData.extraction_log.prompt}`,
          timestamp: new Date(),
        });
      }

      // Add initial response if available
      if (uploadData.extraction_log.response) {
        initialMessages.push({
          id: 'initial-response',
          type: 'assistant',
          content: uploadData.extraction_log.response,
          timestamp: new Date(),
        });
      } else {
        initialMessages.push({
          id: 'initial-success',
          type: 'assistant',
          content: '✅ Successfully extracted receipt data',
          timestamp: new Date(),
        });
      }

      setMessages(initialMessages);
      // Save initial chat
      localStorage.setItem(chatKey, JSON.stringify(initialMessages));
    }
  }, [uploadData.receipt_id]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const chatKey = `chat_${uploadData.receipt_id}`;
      localStorage.setItem(chatKey, JSON.stringify(messages));
    }
  }, [messages, uploadData.receipt_id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReprocess = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for reprocessing');
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: feedback,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add processing indicator
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      type: 'system',
      content: '⏳ Reprocessing with your feedback...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, processingMessage]);

    setReprocessing(true);
    const currentFeedback = feedback;
    setFeedback(''); // Clear input immediately

    try {
      const newData = await receiptApi.reprocess(
        uploadData.receipt_id,
        currentFeedback,
        uploadData.receipt
      );

      // Remove processing indicator
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));

      // Add success message
      setMessages(prev => [...prev, {
        id: `reprocess-success-${Date.now()}`,
        type: 'system',
        content: '✅ Receipt reprocessed successfully!',
        timestamp: new Date(),
      }]);

      // Add new AI response if available
      if (newData.extraction_log.response) {
        setMessages(prev => [...prev, {
          id: `response-${Date.now()}`,
          type: 'assistant',
          content: newData.extraction_log.response,
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `response-${Date.now()}`,
          type: 'assistant',
          content: 'Receipt data updated based on your feedback',
          timestamp: new Date(),
        }]);
      }

      toast.success('Receipt reprocessed successfully!');
      onReprocess(newData);
    } catch (error: any) {
      console.error('Reprocess error:', error);

      // Remove processing indicator
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));

      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        content: `❌ Error: ${error.response?.data?.detail || 'Failed to reprocess receipt'}`,
        timestamp: new Date(),
      }]);

      toast.error(error.response?.data?.detail || 'Failed to reprocess receipt');
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-b from-blue-600 to-purple-600 text-white px-3 py-6 rounded-l-xl shadow-lg hover:px-4 transition-all z-40"
        title="View extraction details"
      >
        <div className="flex flex-col items-center space-y-2">
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-xs font-semibold writing-mode-vertical">
            AI Chat
          </span>
        </div>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">🤖 Extraction Details</h3>
                <p className="text-xs text-blue-100">
                  Powered by Gemini AI
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {message.type === 'system' && (
                  <div className="flex justify-center">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      {message.content}
                    </div>
                  </div>
                )}

                {message.type === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="flex items-center justify-end space-x-2 mb-1">
                        <span className="text-xs text-gray-500">You</span>
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          U
                        </div>
                      </div>
                      <div className="bg-purple-600 text-white rounded-lg rounded-tr-none p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                )}

                {message.type === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          AI
                        </div>
                        <span className="text-xs text-gray-500">Gemini AI</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none p-3 shadow-sm">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Feedback Section */}
          <div className="border-t border-gray-200 p-4 bg-white space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💬 Provide feedback to improve extraction
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'The total should be $45.99, not $44.99' or 'This item is in the wrong category'"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700"
                disabled={reprocessing}
              />
            </div>
            <button
              onClick={handleReprocess}
              disabled={reprocessing || !feedback.trim()}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {reprocessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Reprocessing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Reprocess with Feedback</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              AI will re-analyze the receipt with your feedback
            </p>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
