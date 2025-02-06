import { useState, useRef, useCallback } from "react";
import { User } from "../types/index";

interface UseMentionResult {
  showMentions: boolean;
  mentionFilter: string;
  mentionStartIndex: number;
  handleMessageChange: (text: string) => void;
  handleMentionSelect: (userName: string) => string;
  resetMention: () => void;
  filteredMembers: (members: User[], currentUserId: string) => User[];
}

export function useMention(): UseMentionResult {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const mentionStartIndexRef = useRef<number>(-1);

  const handleMessageChange = useCallback((text: string) => {
    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex !== -1 && lastAtIndex === mentionStartIndexRef.current) {
      const filterText = text.slice(lastAtIndex + 1);
      setMentionFilter(filterText);
      setShowMentions(true);
    } else if (text.endsWith("@")) {
      mentionStartIndexRef.current = text.length - 1;
      setMentionFilter("");
      setShowMentions(true);
    } else {
      setShowMentions(false);
      mentionStartIndexRef.current = -1;
    }
  }, []);

  const handleMentionSelect = useCallback(
    (userName: string) => {
      if (mentionStartIndexRef.current === -1) return "";

      const before = mentionStartIndexRef.current;
      const after = mentionFilter.length;
      mentionStartIndexRef.current = -1;
      setShowMentions(false);
      setMentionFilter("");

      return `${before}${userName}${after}`;
    },
    [mentionFilter]
  );

  const resetMention = useCallback(() => {
    setShowMentions(false);
    setMentionFilter("");
    mentionStartIndexRef.current = -1;
  }, []);

  const filteredMembers = useCallback(
    (members: User[], currentUserId: string) => {
      return members.filter(
        (member) =>
          member.id !== currentUserId &&
          member.name.toLowerCase().includes(mentionFilter.toLowerCase())
      );
    },
    [mentionFilter]
  );

  return {
    showMentions,
    mentionFilter,
    mentionStartIndex: mentionStartIndexRef.current,
    handleMessageChange,
    handleMentionSelect,
    resetMention,
    filteredMembers,
  };
}
