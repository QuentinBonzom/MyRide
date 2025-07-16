import { useState, useEffect, useContext } from "react";
import { auth, db, storage } from "../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import {
  ref as storageRef,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject
} from "firebase/storage";
import {
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { UserContext } from "../context/UserContext";
import { useRouter } from "next/router";
import Image from "next/image";
import { useTranslation } from "react-i18next";

// Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Currency and Language options for select inputs
const currencyOptions = [
  { value: "USD", label: "$ - USD" },
  { value: "EUR", label: "€ - EUR" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

// Reusable select component with label
function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function UserProfilePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { setUserProfile } = useContext(UserContext);

  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [i18nReady, setI18nReady] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "members", user.uid);
          const userDoc = await getDoc(docRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setFormData(data);

            const lang = data.language || "en";
            if (i18n.language !== lang) {
              await i18n.changeLanguage(lang);
            }
            setI18nReady(true);
          } else {
            setUserData(null);
            setFormData({});
            if (i18n.language !== "en") {
              await i18n.changeLanguage("en");
            }
            setI18nReady(true);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          if (i18n.language !== "en") {
            await i18n.changeLanguage("en");
          }
          setI18nReady(true);
        }
      } else {
        setUserData(null);
        setFormData({});
        if (i18n.language !== "en") {
          await i18n.changeLanguage("en");
        }
        setI18nReady(true);
        router.push("/login_page");
      }
    });
    return unsubscribe;
  }, [i18n, router]);

  // Body background color
  useEffect(() => {
    document.body.style.backgroundColor = "#1a202c";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  // Load user data & profile picture, set language on load
  useEffect(() => {
    if (!user) {
      router.push("/login_page");
      return;
    }
    (async () => {
      const userDoc = await getDoc(doc(db, "members", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setFormData(data);

        const lang = data.language || "en";
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
        }
        setI18nReady(true);
      }
      try {
        const url = await getDownloadURL(
          storageRef(storage, `members/${user.uid}/profilepicture.png`)
        );
        setProfilePicture(url);
      } catch {}
    })();
  }, [user, router, i18n]);

  // Sync i18n language when formData.language changes (when user edits language)
  useEffect(() => {
    if (formData.language && i18n.language !== formData.language) {
      i18n.changeLanguage(formData.language).then(() => setI18nReady(true));
    }
  }, [formData.language, i18n]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("profile.invite_code_copied"));
    });
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      await updateDoc(doc(db, "members", user.uid), formData);
      setUserData(formData);

      if (newPassword) {
        await updatePassword(user, newPassword);
        toast.success(t("profile.password_updated"));
        setNewPassword("");
      }

      setEditing(false);
    } catch (error) {
      toast.error(t("profile.save_error") + ": " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      toast.info(t("profile.deletion_cancelled"));
      return;
    }
    setShowConfirmDelete(false);

    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, "members", user.uid));
      try {
        const pictureRef = storageRef(storage, `members/${user.uid}/profilepicture.png`);
        await deleteObject(pictureRef);
      } catch (err) {
        console.warn("No profile picture to delete or error:", err.message);
      }
      await deleteUser(user);
      setUserProfile(null);
      toast.success(t("profile.deleted_success"));
      router.push("/login_page");
    } catch (error) {
      console.error("Error deleting profile:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.error(t("profile.reauth_required"));
        router.push("/login_page");
      } else {
        toast.error(t("profile.delete_error") + ": " + error.message);
      }
    }
  };

  if (!i18nReady) {
    return (
      <p className="mt-20 text-center text-gray-300">Loading...</p>
    );
  }

  if (!auth.currentUser)
    return (
      <p className="mt-20 text-center text-gray-300">{t("profile.login_to_view")}</p>
    );

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm p-6 bg-gray-800 rounded-xl">
            <h2 className="mb-4 text-xl font-semibold text-center text-gray-100">
              {t("profile.confirm_delete_title")}
            </h2>
            <p className="mb-4 text-center text-gray-300">{t("profile.confirm_delete_desc")}</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t("profile.password_placeholder")}
              className="w-full px-4 py-2 mb-6 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setDeletePassword("");
                }}
                className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-500"
              >
                {t("profile.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                {t("profile.delete_button")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen px-6 mb-16 text-gray-100 bg-gray-800 md:mb-5">
        <h1 className="pt-5 mb-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-700">
          {t("profile.title")}
        </h1>

        <div className="max-w-3xl p-1 mx-auto rounded-2xl bg-gradient-to-r from-gray-700 to-gray-900">
          <div className="p-6 space-y-6 bg-gray-900 rounded-2xl">
            <div className="flex flex-col items-center">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt="Profile"
                  width={80}
                  height={80}
                  quality={80}
                  className="w-32 h-32 border-4 border-gray-700 rounded-full"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-700 rounded-full" />
              )}
              {editing && (
                <label className="mt-4 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      setUploading(true);
                      const storageRefPic = storageRef(
                        storage,
                        `members/${auth.currentUser.uid}/profilepicture.png`
                      );
                      const task = uploadBytesResumable(storageRefPic, file);
                      await new Promise((res) =>
                        task.on("state_changed", null, null, res)
                      );
                      const url = await getDownloadURL(task.snapshot.ref);
                      setProfilePicture(url);
                      setUserProfile((u) => ({ ...u, profileImage: url }));
                      setUploading(false);
                      toast.info(t("profile.picture_updated"));
                    }}
                    className="hidden"
                  />
                  {t("profile.change_picture")}
                </label>
              )}
            </div>

            <div className="space-y-4">
              {/* Normal text inputs */}
              {["firstName", "middleName", "lastName", "phoneNumber"].map((field) => (
                <div key={field} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-300 capitalize">
                    {t(`profile.${field}`)}
                  </label>
                  {editing ? (
                    <input
                      value={formData[field] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field]: e.target.value })
                      }
                      className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="px-4 py-2 mt-1 text-gray-200 bg-gray-700 rounded-lg">
                      {userData?.[field] || "-"}
                    </p>
                  )}
                </div>
              ))}

              {/* Language select */}
              <SelectField
                label={t("profile.language")}
                value={formData.language || "en"}
                onChange={(val) => setFormData({ ...formData, language: val })}
                options={languageOptions}
              />

              {/* Currency select */}
              <SelectField
                label={t("profile.currency")}
                value={formData.currency || "USD"}
                onChange={(val) => setFormData({ ...formData, currency: val })}
                options={currencyOptions}
              />

              {/* Invite code */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-300">
                  {t("profile.invite_code")}
                </label>
                <div className="flex items-center px-4 py-2 mt-1 space-x-2 text-gray-200 bg-gray-700 rounded-lg">
                  <span className="break-all">{userData?.invitationcode || "-"}</span>
                  <button
                    onClick={() => copyToClipboard(userData?.invitationcode || "")}
                    className="px-2 py-1 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    {t("profile.copy")}
                  </button>
                </div>
              </div>

              {/* Email (readonly) */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-300">{t("profile.email")}</label>
                <p className="px-4 py-2 mt-1 text-gray-200 bg-gray-700 rounded-lg">{user.email}</p>
              </div>

              {/* New password */}
              {editing && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-300">
                    {t("profile.new_password")}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("profile.password_placeholder")}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-4 space-x-4 border-t border-gray-700">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    {uploading ? t("profile.saving") : t("profile.save")}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-500"
                  >
                    {t("profile.cancel")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    {t("profile.edit")}
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    {t("profile.delete_button")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
