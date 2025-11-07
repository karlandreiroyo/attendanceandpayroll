/**
 * Logout utility function that clears session and redirects to login
 * This function ensures proper logout and prevents back/forward button from restoring session
 */
export const handleLogout = () => {
  try {
    // Clear all session storage items explicitly
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("loginTime");
    sessionStorage.removeItem("firstName");
    sessionStorage.removeItem("lastName");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("profilePicture");
    
    // Set logout flag to prevent back/forward button from restoring session
    // This flag will be checked by ProtectedRoute and login page
    sessionStorage.setItem("isLoggedOut", Date.now().toString());
    
    // Clear forward history by replacing current entry with login page
    // This prevents forward navigation from restoring logged-in state
    window.history.replaceState(null, "", "/");
    
    // Use window.location.replace for a full page reload without adding to history
    // This ensures the session is cleared and prevents back/forward button from restoring logged-in state
    window.location.replace("/");
  } catch (error) {
    // If there's an error, force navigation anyway
    console.error("Logout error:", error);
    // Ensure logout flag is set even on error
    try {
      sessionStorage.setItem("isLoggedOut", Date.now().toString());
      window.history.replaceState(null, "", "/");
    } catch (e) {
      // Ignore storage errors
    }
    window.location.href = "/";
  }
};

