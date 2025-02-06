import { useReducer, useCallback } from "react";
import { Message } from "../types";
import { ReadStatusUpdate } from "../types/socket";
import { ERROR_MESSAGES } from "../constants";
import { messageReducer, MessageState } from "./useMessageReducer";

const initialState: MessageState = {
  messages: [],
  error: null,
};

export function useMessageState() {
  const [state, dispatch] = useReducer(messageReducer, initialState);

  // 新しいメッセージの追加
  const addMessage = useCallback((message: Message) => {
    dispatch({ type: "ADD_MESSAGE", payload: message });
  }, []);

  // メッセージの一括追加
  const addMessages = useCallback((newMessages: Message[]) => {
    dispatch({ type: "ADD_MESSAGES", payload: newMessages });
  }, []);

  // 既読ステータスの更新
  const updateReadStatus = useCallback((updates: ReadStatusUpdate[]) => {
    dispatch({ type: "UPDATE_READ_STATUS", payload: updates });
  }, []);

  // エラー設定
  const setErrorMessage = useCallback(
    (errorType: keyof typeof ERROR_MESSAGES) => {
      dispatch({ type: "SET_ERROR", payload: ERROR_MESSAGES[errorType] });
    },
    []
  );

  // エラークリア
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    messages: state.messages,
    error: state.error,
    addMessage,
    addMessages,
    updateReadStatus,
    setErrorMessage,
    clearError,
  };
}
