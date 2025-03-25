import React, { useState, useEffect } from "react";
import Switch from "react-switch";
import { FaExclamationTriangle, FaTrash, FaDoorOpen, FaBell, FaBellSlash } from "react-icons/fa";
import axios from "axios";

const SecuritySettings = ({ chatId }) => {
  const [isHidden, setIsHidden] = useState(false);
  const [pin, setPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/conversations/${chatId}`);
        setIsGroup(response.data.isGroup);
        setIsMuted(response.data.isMuted);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin cuộc trò chuyện:", error);
      }
    };
    fetchChatInfo();
  }, [chatId]);

  const handleToggle = (checked) => {
    if (checked) {
      setShowPinInput(true);
    } else {
      setIsHidden(false);
      setShowPinInput(false);
      setPin("");
    }
  };

  const handleSubmitPin = () => {
    if (pin.length === 4) {
      setIsHidden(true);
      setShowPinInput(false);
    } else {
      alert("Mã PIN phải có 4 chữ số!");
    }
  };

  const handleReport = async () => {
    try {
      await axios.post(`http://localhost:5000/conversations/${chatId}/report`);
      alert("Đã gửi báo cáo thành công!");
    } catch (error) {
      console.error("Lỗi khi báo cáo cuộc trò chuyện:", error);
    }
  };

  const handleDeleteHistory = async () => {
    try {
      await axios.delete(`http://localhost:5000/conversations/${chatId}/messages`);
      alert("Đã xóa lịch sử trò chuyện!");
    } catch (error) {
      console.error("Lỗi khi xóa lịch sử trò chuyện:", error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await axios.post(`http://localhost:5000/conversations/${chatId}/leave`);
      alert("Bạn đã rời khỏi nhóm!");
    } catch (error) {
      console.error("Lỗi khi rời nhóm:", error);
    }
  };

  const toggleMute = async () => {
    try {
      await axios.put(`http://localhost:5000/conversations/${chatId}/mute`, {
        isMuted: !isMuted,
      });
      setIsMuted(!isMuted);
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái thông báo:", error);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold mb-2">Thiết lập bảo mật</h3>

      {/* Bật/tắt thông báo */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Thông báo</span>
        <button onClick={toggleMute} className="text-gray-600 hover:text-gray-800">
          {isMuted ? <FaBellSlash size={18} /> : <FaBell size={18} />}
        </button>
      </div>

      {/* Ẩn trò chuyện */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Ẩn trò chuyện</span>
        <Switch
          onChange={handleToggle}
          checked={isHidden}
          offColor="#ccc"
          onColor="#3b82f6"
          uncheckedIcon={false}
          checkedIcon={false}
          height={22}
          width={44}
          handleDiameter={18}
        />
      </div>

      {/* Form nhập mã PIN */}
      {showPinInput && (
        <div className="mt-2 p-3 bg-gray-100 rounded-lg">
          <label className="block text-sm font-semibold mb-1">Nhập mã PIN (4 chữ số)</label>
          <input
            type="password"
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            placeholder="****"
          />
          <button
            onClick={handleSubmitPin}
            className="w-full mt-2 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          >
            Xác nhận
          </button>
        </div>
      )}

      {/* Các nút hành động */}
      <button
        className="w-full text-red-500 text-left flex items-center gap-2 mt-2"
        onClick={handleReport}
      >
        <FaExclamationTriangle size={16} />
        Báo xấu
      </button>
      <button
        className="w-full text-red-500 text-left flex items-center gap-2 mt-2"
        onClick={handleDeleteHistory}
      >
        <FaTrash size={16} />
        Xóa lịch sử trò chuyện
      </button>
      {isGroup && (
        <button
          className="w-full text-red-500 text-left flex items-center gap-2 mt-2"
          onClick={handleLeaveGroup}
        >
          <FaDoorOpen size={16} />
          Rời nhóm
        </button>
      )}
    </div>
  );
};

export default SecuritySettings;