import React, { useEffect, useMemo } from 'react';

interface FilePreviewProps {
  files: File[];
  imageDataList: string[];
  onRemove: (index: number) => void;
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="absolute -top-1 -right-1 z-10 bg-black rounded-full w-5 h-5 shadow-md hover:bg-gray-900 transition-colors flex items-center justify-center"
    >
      <div className="i-ph:x w-3 h-3 text-gray-200" />
    </button>
  );
}

function FileNameBadge({ name }: { name: string }) {
  return (
    <div className="absolute bottom-0 w-full h-5 flex items-center px-2 rounded-b-lg text-bolt-elements-textTertiary font-thin text-xs bg-bolt-elements-background-depth-2">
      <span className="truncate">{name}</span>
    </div>
  );
}

/*
 * Video files never get an imageDataList entry (that array feeds image content parts
 * sent to the model), so their thumbnail comes from a local object URL instead.
 */
function VideoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="relative">
      <video
        src={url}
        muted
        preload="metadata"
        className="max-h-20 rounded-lg"
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = 0.1;
        }}
      />
      <div className="absolute top-1 left-1 bg-black/70 rounded w-4 h-4 flex items-center justify-center">
        <div className="i-ph:play-fill w-2.5 h-2.5 text-white" />
      </div>
      <RemoveButton onRemove={onRemove} />
      <FileNameBadge name={file.name} />
    </div>
  );
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, imageDataList, onRemove }) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row overflow-x-auto mx-2 -mt-1 p-2 bg-bolt-elements-background-depth-3 border border-b-none border-bolt-elements-borderColor rounded-lg rounded-b-none">
      {files.map((file, index) => (
        <div key={file.name + file.size} className="mr-2 relative">
          {imageDataList[index] ? (
            <div className="relative">
              <img src={imageDataList[index]} alt={file.name} className="max-h-20 rounded-lg" />
              <RemoveButton onRemove={() => onRemove(index)} />
              <FileNameBadge name={file.name} />
            </div>
          ) : (
            <VideoThumb file={file} onRemove={() => onRemove(index)} />
          )}
        </div>
      ))}
    </div>
  );
};

export default FilePreview;
