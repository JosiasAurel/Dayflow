//
//  ContentView.swift
//  Dayflow
//
//  Created by Njouondo Djimi Josias Aurel on 08/06/2025.
//

import SwiftUI
import AppKit
import UniformTypeIdentifiers

struct  ThemePackCreatorModal: View {
    @State private var showModal = false
    
    // variables for the files
    @State private var selectedFile: URL?
    @State private var selectedImage: NSImage?
    @State private var errorMessage: String?
    
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack {
            Button("Choose File") {
                let panel = NSOpenPanel()
                panel.allowedContentTypes = [.image]
                panel.allowsMultipleSelection = false
                panel.canChooseDirectories = false
                panel.canChooseFiles = true
                
                if panel.runModal() == .OK, let url = panel.url {
                    selectedFile = panel.url
                    selectedImage = NSImage(contentsOf: url)
                }
            }
            
//            if let file = selectedFile {
//                Text("Selected file: \(file.lastPathComponent)")
//            }
            if let image = selectedImage {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 300, height: 300)
                    .border(Color.gray)
                
                Button("Set as wallpaper") {
                    setDesktopWallpaper(imageURL: selectedFile!)
                }
            }
            
            Button("Set Light") {
                setSystemAppearance()
            }
            
            
            Button("Set Dark") {
                setSystemAppearance()
            }
            if let error = errorMessage {
                Text("Error: \(error)")
                    .foregroundStyle(.red)
            }
            
            Button("Close") {
                dismiss()
            }
        }
        .padding()
    }
    
    func setDesktopWallpaper(imageURL: URL) {
        let workspace = NSWorkspace.shared
        let screen = NSScreen.main ?? NSScreen.screens.first!

        do {
            try workspace.setDesktopImageURL(imageURL, for: screen, options: [:])
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func setSystemAppearance() {
        let script = """
        tell application "System Events"
            activate
            tell appearance preferences
                set dark mode to not dark mode
            end tell
        end tell
        """

        let appleScript = NSAppleScript(source: script)
        
        var errorInfo: NSDictionary? = nil
        appleScript?.executeAndReturnError(&errorInfo)
        
        if let error = errorInfo {
            print("AppleScript Error: ")
            print(error)
        } else {
            print("AppleScript Ran Successfully")
        }
    }
    
}

struct FilePicker: View {
//    @State private var selectedFile: URL?
//    @State private var selectedImage: NSImage?
//    @State private var errorMessage: String?
    
    var body: some View {
        
    }
    
//    func setDesktopWallpaper(imageURL: URL) {
//        let workspace = NSWorkspace.shared
//        let screen = NSScreen.main ?? NSScreen.screens.first!
//        
//        do {
//            try workspace.setDesktopImageURL(imageURL, for: screen, options: [:])
//        } catch {
//            errorMessage = error.localizedDescription
//        }
//    }
//    
}

struct ContentView: View {
    @State private var showThemeCreatorModal = false
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Dayflow!")
        }
        .padding()
        Button("Add Theme Pack") {
            showThemeCreatorModal = true
        }
        .sheet(isPresented: $showThemeCreatorModal) {
            ThemePackCreatorModal()
        }
    }
}

#Preview {
    ContentView()
        
}
