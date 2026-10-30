import React, { useRef } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Icon } from "#/components/Icon/Icon";

type CropModalProps = {
  isOpen: boolean;
  isActionsDisabled: boolean;
  selectedImage: any | null;
  croppedImage: any | null;
  setCropModalProps: (props: {
    isOpen: boolean;
    isActionsDisabled: boolean;
    selectedImage: any | null;
    croppedImage: any | null;
  }) => void;
  cropParams: {
    guides?: boolean;
    width?: number;
    height?: number;
    quality?: number;
    aspectRatio?: number;
    forceAspect?: boolean;
  };
};

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  setCropModalProps,
  cropParams,
  selectedImage,
  croppedImage,
  isActionsDisabled,
}) => {
  const cropperRef = useRef<ReactCropperElement>(null);

  const getCropData = () => {
    if (typeof cropperRef.current?.cropper !== "undefined") {
      const croppedImage = cropperRef.current?.cropper
        .getCroppedCanvas({
          width: cropParams.width,
          height: cropParams.height,
          maxWidth: cropParams.width,
          maxHeight: cropParams.height,
        })
        .toDataURL(
          "image/jpeg",
          cropParams.quality || false ? cropParams.quality : 100
        );

      setCropModalProps({
        isOpen: true,
        isActionsDisabled: false,
        selectedImage: selectedImage,
        croppedImage: croppedImage,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setCropModalProps({
            isOpen: false,
            isActionsDisabled: false,
            selectedImage: null,
            croppedImage: null,
          });
        }
      }}
    >
      <div className="mb" style={{ width: "min(1100px, 100%)" }}>
        <div className="mb-head">
          <h3>Обрезать изображение</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() =>
              setCropModalProps({
                isOpen: false,
                isActionsDisabled: false,
                selectedImage: null,
                croppedImage: null,
              })
            }
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="crop-area">
          <Cropper
            src={selectedImage}
            style={{ height: 400, width: "100%" }}
            responsive={true}
            initialAspectRatio={cropParams.aspectRatio || 1 / 1}
            aspectRatio={
              cropParams.forceAspect || false
                ? cropParams.aspectRatio
                : undefined
            }
            guides={cropParams.guides || false}
            ref={cropperRef}
          />
        </div>

        <div className="crop-help">
          <h4>Управление</h4>
          <p>Тяните за углы, чтобы выбрать область</p>
          <p>
            Нажмите два раза на пустое место, чтобы поменять режим выбора области
            на перемещение и обратно
          </p>
          <p>Используйте колёсико мыши, чтобы изменить масштаб</p>
        </div>

        <div className="mb-foot">
          <button
            type="button"
            className="btn p"
            disabled={isActionsDisabled}
            onClick={() => {
              getCropData();
            }}
          >
            <Icon name="check" size={16} />
            Сохранить
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={isActionsDisabled}
            onClick={() => {
              setCropModalProps({
                isOpen: false,
                isActionsDisabled: false,
                selectedImage: null,
                croppedImage: null,
              });
            }}
          >
            <Icon name="x" size={16} />
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
};
