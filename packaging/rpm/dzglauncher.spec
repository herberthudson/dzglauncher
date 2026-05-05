Name:           dzglauncher
Version:        %{ver}
Release:        1
Summary:        Browse DayZ servers, favorites, Workshop mods, and launch via Steam

License:        Apache-2.0
URL:            https://github.com/herberthudson/dzglauncher

BuildArch:      x86_64

Requires:       gtk3 >= 3.22
Requires:       webkit2gtk4.1
Requires:       librsvg2
Requires:       hicolor-icon-theme
Requires:       desktop-file-utils

%description
Desktop launcher to browse DayZ servers, manage favorites, Workshop mods, and
connect via Steam.

%prep

%build

%install
install -D -m755 /workspace/staging/dzglauncher %{buildroot}%{_bindir}/dzglauncher
install -D -m644 /workspace/staging/LICENSE %{buildroot}%{_licensedir}/%{name}/LICENSE
install -D -m644 /workspace/staging/README.md %{buildroot}%{_docdir}/%{name}/README.md
install -D -m644 /workspace/staging/share/applications/dzglauncher.desktop %{buildroot}%{_datadir}/applications/dzglauncher.desktop
install -D -m644 /workspace/staging/share/icons/hicolor/256x256/apps/dzglauncher.png %{buildroot}%{_datadir}/icons/hicolor/256x256/apps/dzglauncher.png

%post
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t %{_datadir}/icons/hicolor &>/dev/null || :
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database %{_datadir}/applications &>/dev/null || :
fi

%postun
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t %{_datadir}/icons/hicolor &>/dev/null || :
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database %{_datadir}/applications &>/dev/null || :
fi

%files
%license %{_licensedir}/%{name}/LICENSE
%doc %{_docdir}/%{name}/README.md
%{_bindir}/dzglauncher
%{_datadir}/applications/dzglauncher.desktop
%{_datadir}/icons/hicolor/256x256/apps/dzglauncher.png

%changelog
* Tue May 05 2026 dzglauncher <noreply.invalid> - 1-1
- Automated release build
