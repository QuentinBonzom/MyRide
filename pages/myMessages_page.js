// pages/MyMessagesPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

export default function MyMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef(null);

  // 1. Check auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login_page");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsub();
  }, [router]);

  // 2. Load conversations from Firestore
  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("participants", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [user]);

  // 3. Ouverture d’une conversation (mode démo)
  const openConversation = (conversation) => {
    setSelectedConversation({
      ...conversation,
      buyerName: user.displayName || "You",
      buyerAvatar: user.photoURL || "https://i.pravatar.cc/150?img=65",
      sellerName: conversation.sellerName || "John",
      sellerAvatar: conversation.picture || "https://i.pravatar.cc/150?img=3",
      messages: [
        {
          sender: conversation.sellerName || "John",
          text: "Hello, how can I help you?",
        },
        {
          sender: user.displayName || "You",
          text: "Hi, I'm interested in the Audi A5 2018. Is it still available?",
        },
        {
          sender: conversation.sellerName || "John",
          text: "Yes, it's still available. Would you like to schedule a test drive?",
        },
        {
          sender: user.displayName || "You",
          text: "That would be great. I'm available this weekend. Does that work for you?",
        },
        {
          sender: conversation.sellerName || "John",
          text: "Yes, Saturday morning works for me. I'll send you the address.",
        },
        {
          sender: user.displayName || "You",
          text: "Perfect, thank you! Looking forward to it.",
        },
      ],
    });
    setInputValue("");
  };

  // 4. Fermer la modal
  const closeConversation = () => setSelectedConversation(null);

  // 5. Scroll auto
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConversation]);

  // 6. Envoi d’un nouveau message
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !selectedConversation) return;
    setSelectedConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, { sender: prev.buyerName, text }],
    }));
    setInputValue("");
  };

  if (!user) {
    return <p className="text-center text-white">Loading...</p>;
  }

  return (
    <section className="flex flex-col h-screen text-white bg-gray-900 pb-12">
      {/* Header repensé */}
      <header className="px-4 py-8 text-center bg-gradient-to-r from-gray-800 to-gray-600">
        <h1 className="text-4xl font-extrabold">Messages</h1>
        <p className="mt-2 text-lg text-gray-300">
          Your conversations at a glance
        </p>
      </header>

      {/* Liste des conversations */}
      <ul className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        {conversations.length === 0 ? (
          <li className="text-center text-gray-500">No chats yet.</li>
        ) : (
          conversations.map(({ id, sellerName, vehicleName, picture }) => (
            <li
              key={id}
              onClick={() =>
                openConversation({ id, sellerName, vehicleName, picture })
              }
              className="flex items-center p-4 bg-gray-800 rounded-xl shadow-md cursor-pointer hover:bg-gray-700 transition"
            >
              <Image
                src={picture || "https://i.pravatar.cc/150?img=3"}
                alt={sellerName}
                width={56}
                height={56}
                className="border-2 border-purple-500 rounded-full object-cover"
              />
              <div className="ml-4">
                <p className="font-semibold">{sellerName}</p>
                <p className="text-sm text-gray-400">
                  {vehicleName || "Vehicle"}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Modal de Chat */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center">
              <Image
                src={selectedConversation.sellerAvatar}
                alt={selectedConversation.sellerName}
                width={48}
                height={48}
                className="border-2 border-purple-500 rounded-full object-cover"
              />
              <div className="ml-4">
                <p className="font-semibold">
                  {selectedConversation.sellerName}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedConversation.vehicleName}
                </p>
              </div>
            </div>
            <button
              onClick={closeConversation}
              className="text-3xl text-gray-300"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 px-6 py-4 space-y-4 overflow-auto"
          >
            {selectedConversation.messages.map((msg, i) => {
              const isUser = msg.sender === selectedConversation.buyerName;
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-200"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <span className="block mt-1 text-xs text-right text-gray-400">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barre d'entrée */}
          <div className="flex items-center px-6 py-4 bg-gray-800 border-t border-gray-700">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 text-white bg-gray-700 rounded-xl focus:outline-none"
            />
            <button
              onClick={handleSend}
              className="px-5 py-2 ml-4 text-white bg-purple-500 hover:bg-purple-600 rounded-xl"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
