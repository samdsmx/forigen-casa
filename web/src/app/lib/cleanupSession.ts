/**
 * Aggressive session cleanup - removes ALL Supabase-related data
 * Use this when session is corrupted and normal signOut() doesn't work
 */
export async function cleanupSession() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clear all localStorage
    localStorage.clear();
    
    // 2. Clear all sessionStorage
    sessionStorage.clear();

    // 3. Clear all Supabase cookies manually
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      
      // Remove cookie for all possible paths and domains
      if (name.includes('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        
        // Also try with leading dot for subdomain cookies
        const parts = window.location.hostname.split('.');
        if (parts.length > 1) {
          const domain = '.' + parts.slice(-2).join('.');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
        }
      }
    }

    console.log('[CleanupSession] All session data cleared');
  } catch (error) {
    console.error('[CleanupSession] Error during cleanup:', error);
  }
}
