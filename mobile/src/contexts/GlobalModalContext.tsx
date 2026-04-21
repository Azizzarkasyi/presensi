import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {Alert} from "react-native";

interface GlobalModalState {
  visible: boolean;
  message: string;
  title?: string;
  buttonText?: string;
  secondaryButtonText?: string;
  isError?: boolean;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
}

interface GlobalModalContextProps {
  showModal: (options: Omit<GlobalModalState, "visible">) => void;
  hideModal: () => void;
  modal: GlobalModalState;
}

const GlobalModalContext = createContext<GlobalModalContextProps | undefined>(
  undefined,
);

export const useGlobalModal = () => {
  const context = useContext(GlobalModalContext);
  if (!context)
    throw new Error("useGlobalModal must be used within GlobalModalProvider");
  return context;
};

export const GlobalModalProvider = ({children}: {children: ReactNode}) => {
  const [modal, setModal] = useState<GlobalModalState>({
    visible: false,
    message: "",
  });

  const showModal = (options: Omit<GlobalModalState, "visible">) => {
    setModal({...options, visible: true});
  };

  const hideModal = () => {
    setModal(prev => ({...prev, visible: false}));
  };

  useEffect(() => {
    const originalAlert = Alert.alert;

    Alert.alert = ((title: string, message?: string, buttons?: any[]) => {
      const safeButtons = Array.isArray(buttons) ? buttons : [];
      const cancelButton =
        safeButtons.find(button => button?.style === "cancel") ||
        safeButtons[0];
      const primaryButton =
        safeButtons.find(button => button?.style !== "cancel") ||
        safeButtons[safeButtons.length - 1];

      if (safeButtons.length <= 1) {
        showModal({
          title,
          message: message || "",
          buttonText: safeButtons[0]?.text || "OK",
          isError: safeButtons[0]?.style === "destructive",
          onPrimaryPress: safeButtons[0]?.onPress,
        });
        return;
      }

      showModal({
        title,
        message: message || "",
        buttonText: primaryButton?.text || "OK",
        secondaryButtonText: cancelButton?.text || "Batal",
        isError: primaryButton?.style === "destructive",
        onPrimaryPress: primaryButton?.onPress,
        onSecondaryPress: cancelButton?.onPress,
      });
    }) as typeof Alert.alert;

    return () => {
      Alert.alert = originalAlert;
    };
  }, []);

  return (
    <GlobalModalContext.Provider value={{showModal, hideModal, modal}}>
      {children}
    </GlobalModalContext.Provider>
  );
};
