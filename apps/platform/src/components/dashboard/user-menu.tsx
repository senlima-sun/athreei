"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session, isPending } = useSession();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (isPending) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "User avatar"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {initials}
          </div>
        )}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {/* User info */}
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-medium text-gray-900">
              {user.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/settings");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/settings/profile");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="h-4 w-4 text-gray-400" />
              Profile
            </button>
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
