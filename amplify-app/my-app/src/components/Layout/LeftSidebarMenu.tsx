"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";

interface LeftSidebarProps {
  toggleActive: () => void;
}

const LeftSidebarMenu: React.FC<LeftSidebarProps> = ({ toggleActive }) => {
  const pathname = usePathname();

  return (
    <>
      <Box className="leftSidebarDark hide-for-horizontal-nav">
        <Box className="left-sidebar-menu">
          <Box className="logo">
            <Link href="/">
              <Typography component={"span"} sx={{ fontSize: '1.5rem', mr: 1 }}>🎨</Typography>
              <Typography component={"span"}>Chill App</Typography>
            </Link>
          </Box>

          <Box className="burger-menu" onClick={toggleActive}>
            <Typography component={"span"} className="top-bar"></Typography>
            <Typography component={"span"} className="middle-bar"></Typography>
            <Typography component={"span"} className="bottom-bar"></Typography>
          </Box>

          <Box className="sidebar-inner">
            <Box className="sidebar-menu">
              <Typography
                className="sub-title"
                sx={{
                  display: "block",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  mt: 2,
                  mb: 2
                }}
              >
                MAIN MENU
              </Typography>

              {/* Home Menu Item */}
              <Box className="sidebar-single-menu" sx={{ mb: 1 }}>
                <Link
                  href="/"
                  className={`sidemenu-link ${pathname === "/" ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    textDecoration: "none",
                    color: pathname === "/" ? "#605dff" : "inherit",
                    backgroundColor: pathname === "/" ? "rgba(96, 93, 255, 0.1)" : "transparent",
                    borderRadius: "8px",
                    transition: "all 0.3s ease"
                  }}
                >
                  <i 
                    className="material-symbols-outlined" 
                    style={{ marginRight: "12px", fontSize: "20px" }}
                  >
                    home
                  </i>
                  <Typography component="span" sx={{ fontWeight: pathname === "/" ? 600 : 400 }}>
                    Home
                  </Typography>
                </Link>
              </Box>

              {/* News Menu Item */}
              <Box className="sidebar-single-menu" sx={{ mb: 1 }}>
                <Link
                  href="/news"
                  className={`sidemenu-link ${pathname === "/news" ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    textDecoration: "none",
                    color: pathname === "/news" ? "#605dff" : "inherit",
                    backgroundColor: pathname === "/news" ? "rgba(96, 93, 255, 0.1)" : "transparent",
                    borderRadius: "8px",
                    transition: "all 0.3s ease"
                  }}
                >
                  <i 
                    className="material-symbols-outlined" 
                    style={{ marginRight: "12px", fontSize: "20px" }}
                  >
                    newspaper
                  </i>
                  <Typography component="span" sx={{ fontWeight: pathname === "/news" ? 600 : 400 }}>
                    News
                  </Typography>
                </Link>
              </Box>

              {/* Future menu items will be added here by AI as features are built */}
              
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default LeftSidebarMenu;