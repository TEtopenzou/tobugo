import type { User } from "@shared/schema";

export function useAuth() {
    // No authentication checks - all users are "logged in"
  // This is a mock hook that returns a default authenticated user
  const mockUser: User = {
        id: "anonymous",
        username: "Guest User",
        email: "guest@tobugo.local",
  };

  return {
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
  };
}
