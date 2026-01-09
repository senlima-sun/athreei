//! aiii Desktop entry point
//!
//! This is the main entry point for the aiii Desktop application.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    aiii_desktop_lib::run();
}
