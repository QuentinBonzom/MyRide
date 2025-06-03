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

// Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function UserProfilePage() {
  const router = useRouter();
  const { setUserProfile } = useContext(UserContext);
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const user = auth.currentUser;

  useEffect(() => {
    document.body.style.backgroundColor = "#1a202c";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

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
      }
      try {
        const url = await getDownloadURL(
          storageRef(storage, `members/${user.uid}/profilepicture.png`)
        );
        setProfilePicture(url);
      } catch {}
    })();
  }, [user, router]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Invitation code copied!");
    });
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      await updateDoc(doc(db, "members", user.uid), formData);
      setUserData(formData);

      if (newPassword) {
        await updatePassword(user, newPassword);
        toast.success("Password updated!");
        setNewPassword("");
      }

      setEditing(false);
    } catch (error) {
      toast.error("Error saving profile: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Lorsque l'utilisateur clique sur "Yes, delete" dans le modal
  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      toast.info("Deletion canceled: password not provided.");
      return;
    }
    setShowConfirmDelete(false);

    try {
      // Ré-authentification avec le mot de passe saisi dans le modal
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // Suppression Firestore
      await deleteDoc(doc(db, "members", user.uid));

      // Suppression Storage (photo de profil)
      try {
        const pictureRef = storageRef(storage, `members/${user.uid}/profilepicture.png`);
        await deleteObject(pictureRef);
      } catch (err) {
        console.warn("No profile picture to delete or error:", err.message);
      }

      // Suppression Auth
      await deleteUser(user);

      // Nettoyage du contexte et redirection
      setUserProfile(null);
      toast.success("Profile deleted! See you soon 🙏");
      router.push("/login_page");
    } catch (error) {
      console.error("Error deleting profile:", error);
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please log in again before deleting your profile.");
        router.push("/login_page");
      } else {
        toast.error("Unable to delete profile: " + error.message);
      }
    }
  };

  if (!auth.currentUser)
    return (
      <p className="mt-20 text-center text-gray-300">
        Please log in to view your profile.
      </p>
    );

  return (
    <>
      {/* ToastContainer – affiche tous les toasts */}
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

      {/* MODAL DE CONFIRMATION – centré au milieu, avec champ mot de passe */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm p-6 bg-gray-800 rounded-xl">
            <h2 className="mb-4 text-xl font-semibold text-center text-gray-100">
              Enter your password to confirm deletion
            </h2>
            <p className="mb-4 text-center text-gray-300">
              This action is irreversible.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
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
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete my profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal de la page */}
      <div className="min-h-screen px-6 mb-5 text-gray-100 bg-gray-800">
        <h1 className="pt-5 mb-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-700">
          My Profile
        </h1>
        <div className="max-w-3xl p-1 mx-auto rounded-2xl bg-gradient-to-r from-gray-700 to-gray-900">
          <div className="p-6 space-y-6 bg-gray-900 rounded-2xl">
            {/* Profile Picture */}
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
                      toast.info("Profile picture updated!");
                    }}
                    className="hidden"
                  />
                  Change Profile Picture
                </label>
              )}
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              {["firstName", "middleName", "lastName", "phoneNumber"].map(
                (field) => (
                  <div key={field} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-300 capitalize">
                      {field.replace(/([A-Z])/g, " $1")}
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
                )
              )}

              {/* Invitation Code */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-300">
                  Invitation Code
                </label>
                <div className="flex items-center px-4 py-2 mt-1 space-x-2 text-gray-200 bg-gray-700 rounded-lg">
                  <span className="break-all">
                    {userData?.invitationcode || "-"}
                  </span>
                  <button
                    onClick={() => copyToClipboard(userData?.invitationcode || "")}
                    className="px-2 py-1 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-300">Email</label>
                <p className="px-4 py-2 mt-1 text-gray-200 bg-gray-700 rounded-lg">
                  {user.email}
                </p>
              </div>

              {/* New Password (only when editing) */}
              {editing && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter new password"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 space-x-4 border-t border-gray-700">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    {uploading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Edit Profile
                  </button>

                  {/* Bouton qui ouvre le modal */}
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Delete my profile
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
