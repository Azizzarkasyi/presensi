import React, {createContext, useContext, useState, ReactNode} from "react";

interface GlobalModalState {
  visible: boolean;
  message: string;
  title?: string;
  buttonText?: string;
  isError?: boolean;
  onClose?: () => void;
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
    if (modal.onClose) modal.onClose();
  };

  return (
    <GlobalModalContext.Provider value={{showModal, hideModal, modal}}>
      {children}
    </GlobalModalContext.Provider>
  );
};
