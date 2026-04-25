import React from "react";

function Header({ drawerOpen, engineOptions, onSelectEngine, onToggleDrawer, selectedEngine }) {
  return (
    <header className="chat-header">
      <button
        className="drawer-toggle chat-toggle"
        type="button"
        aria-label={drawerOpen ? "Close sidebar" : "Open sidebar"}
        onClick={onToggleDrawer}
      >
        ☰
      </button>

      <label className="engine-picker">
        <select value={selectedEngine} onChange={onSelectEngine}>
          {engineOptions.map((engine) => (
            <option key={engine} value={engine}>
              {engine}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

export default Header;
