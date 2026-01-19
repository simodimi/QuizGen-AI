import React from "react";
import "../../style/button.css";
//definir les types de props
interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  style,
}) => {
  return (
    <div>
      <button
        className={`btn ${className}`}
        onClick={onClick}
        type={type}
        disabled={disabled}
        style={style}
      >
        {children}
      </button>
    </div>
  );
};

export default Button;
