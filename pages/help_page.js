import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase"; // firestore importé
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userUid, setUserUid] = useState("");

  // Listen user auth changes and load user language from Firestore
   useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email);
        setUserUid(user.uid);

        try {
          const docRef = doc(db, "members", user.uid);
          const userDoc = await getDoc(docRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            const lang = data.language || "en";
            if (i18n.language !== lang) i18n.changeLanguage(lang);
          } else {
            if (i18n.language !== "en") i18n.changeLanguage("en");
          }
        } catch (err) {
          console.error("Erreur récupération langue utilisateur:", err);
          if (i18n.language !== "en") i18n.changeLanguage("en");
        }
      } else {
        setUserEmail("");
        setUserUid("");
        if (i18n.language !== "en") i18n.changeLanguage("en");
      }
    });
    return unsubscribe;
  }, [i18n]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConfirmation("");
    setError("");

    if (!userEmail || !userUid) {
      setError(t("help.error_not_authenticated"));
      return;
    }

    if (!topic || !message.trim()) {
      setError(t("help.error_fill_fields"));
      return;
    }

    const fullMessage = `
From: ${userEmail}
UID: ${userUid}
Topic: ${topic}

Message:
${message}
    `;

    setLoading(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          topic,
          message: fullMessage,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setConfirmation(t("help.message_sent"));
        setTopic("");
        setMessage("");
      } else {
        setError(data.message || t("help.error_generic"));
      }
    } catch (error) {
      console.error("Error:", error);
      setError(t("help.error_sending"));
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-800">
      <header className="px-4 py-4 bg-black/50">
        <h1 className="mt-5 text-4xl font-bold text-center text-white">
          {t("help.title")}
        </h1>
      </header>

      <main className="flex-grow px-4 py-6">
        <div className="w-full p-4 bg-white rounded-lg shadow">
          <p className="mt-2 text-gray-600">{t("help.description")}</p>
          <form onSubmit={handleSubmit} className="space-y-4" aria-live="polite">
            <div>
              <label
                htmlFor="topic"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                {t("help.topic_label")}
              </label>
              <select
                id="topic"
                name="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">{t("help.select_topic")}</option>
                <option value="Account Issue">{t("help.topic_account_issue")}</option>
                <option value="Feature Request">{t("help.topic_feature_request")}</option>
                <option value="Bug Report">{t("help.topic_bug_report")}</option>
                <option value="Other">{t("help.topic_other")}</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="message"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                {t("help.message_label")}
              </label>
              <textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("help.message_placeholder")}
                rows={6}
                maxLength={2000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-lg font-semibold text-white transition rounded-lg ${
                loading ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {loading ? t("help.sending") : t("help.send_message")}
            </button>
          </form>

          {confirmation && (
            <p className="mt-4 text-center text-green-600" role="alert">
              {confirmation}
            </p>
          )}
          {error && (
            <p className="mt-4 text-center text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>

      <footer className="px-4 py-4 text-sm text-center text-gray-400">
        © {new Date().getFullYear()} MyRide. All rights reserved.
      </footer>
    </div>
  );
}
