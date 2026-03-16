import { Crown, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  displayName?: string | null;
  avatarUrl?: string | null;
  isPro?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const badgeSizeMap = {
  sm: "w-3 h-3 -top-0.5 -right-0.5",
  md: "w-3.5 h-3.5 -top-0.5 -right-0.5",
  lg: "w-4 h-4 -top-1 -right-1",
};

const iconSizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

// Generate a consistent color from a string
function stringToColor(str: string): string {
  const colors = [
    "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
    "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-pink-500", "bg-fuchsia-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const UserAvatar = ({ displayName, avatarUrl, isPro = false, size = "md", className }: UserAvatarProps) => {
  const initial = displayName?.[0]?.toUpperCase() || "?";
  const bgColor = displayName ? stringToColor(displayName) : "bg-muted";

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar className={cn(sizeMap[size])}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={displayName || "用户头像"} />
        ) : null}
        <AvatarFallback className={cn(bgColor, "text-white text-xs font-medium")}>
          {initial === "?" ? <User className="w-4 h-4 text-muted-foreground" /> : initial}
        </AvatarFallback>
      </Avatar>
      {isPro && (
        <div className={cn(
          "absolute flex items-center justify-center rounded-full bg-primary border-2 border-card",
          badgeSizeMap[size]
        )}>
          <Crown className={cn(iconSizeMap[size], "text-primary-foreground")} />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
