import React from "react";
import {SuccessModal} from "./ui/SuccessModal";
import {useGlobalModal} from "../contexts/GlobalModalContext";

export const GlobalModal = () => {
  const {modal, hideModal} = useGlobalModal();
  return (
    <SuccessModal
      visible={modal.visible}
      title={modal.title}
      message={modal.message}
      buttonText={modal.buttonText}
      isError={modal.isError}
      onClose={hideModal}
    />
  );
};
