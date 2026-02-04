import EmojiPicker from "emoji-picker-react";

interface EmojiProps {
  handleEmojiSelect: (emoji: any) => void;
}
const Emoji = ({ handleEmojiSelect }: EmojiProps) => {
  return (
    <EmojiPicker
      onEmojiClick={handleEmojiSelect}
      style={{ border: "1px solid #79ebf1" }}
    />
  );
};

export default Emoji;
