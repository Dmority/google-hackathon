import { Message } from "../types";
import { ReadStatusUpdate } from "../types/socket";

// Action Types
export type MessageAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "ADD_MESSAGES"; payload: Message[] }
  | { type: "UPDATE_READ_STATUS"; payload: ReadStatusUpdate[] }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

// State Type
export interface MessageState {
  messages: Message[];
  error: string | null;
}

// Helper Functions
const isMessageEqual = (msg1: Message, msg2: Message): boolean => {
  return (
    msg1.id === msg2.id &&
    msg1.text === msg2.text &&
    msg1.sender === msg2.sender &&
    msg1.timestamp === msg2.timestamp
  );
};

const removeDuplicateMessages = (messages: Message[]): Message[] => {
  return messages.reduce((unique: Message[], current) => {
    const isDuplicate = unique.some((msg) => isMessageEqual(msg, current));
    if (!isDuplicate) {
      unique.push(current);
    }
    return unique;
  }, []);
};

// Reducer
export function messageReducer(
  state: MessageState,
  action: MessageAction
): MessageState {
  switch (action.type) {
    case "ADD_MESSAGE": {
      const isDuplicate = state.messages.some((msg) =>
        isMessageEqual(msg, action.payload)
      );
      if (isDuplicate) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    }

    case "ADD_MESSAGES": {
      const currentMessages = state.messages;
      const newMessages = action.payload.map((message) => ({
        ...message,
        readBy: message.readBy || [],
        mentions: message.mentions || [],
      }));

      const allMessages = [...currentMessages, ...newMessages];
      const uniqueMessages = removeDuplicateMessages(allMessages);

      return {
        ...state,
        messages: uniqueMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      };
    }

    case "UPDATE_READ_STATUS": {
      return {
        ...state,
        messages: state.messages.map((msg) => {
          const update = action.payload.find((u) => u.messageId === msg.id);
          if (update && !msg.readBy.includes(update.userId)) {
            return { ...msg, readBy: [...msg.readBy, update.userId] };
          }
          return msg;
        }),
      };
    }

    case "SET_ERROR": {
      return {
        ...state,
        error: action.payload,
      };
    }

    case "CLEAR_ERROR": {
      return {
        ...state,
        error: null,
      };
    }

    default:
      return state;
  }
}
