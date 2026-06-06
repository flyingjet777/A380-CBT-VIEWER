# ✈️ Airbus A380 CBT Web Emulator

아시아나항공(Asiana Airlines) A380 전환 교육을 받는 기장 및 부기장님들을 위한 **범용 웹 기반 CBT(Computer Based Training) 에뮬레이터**입니다.

---

## 📢 2026년 6월 업데이트 안내

### 🌐 온라인 파일 로딩 (IMPORT_REMOTE)
- 교육 데이터 파일이 전용 서버(**airbus380cbt.com**)에 업로드되어 있습니다.
- **IMPORT_REMOTE** 버튼을 클릭하면 서버에 직접 연결하여 파일 목록을 불러올 수 있습니다.
- 접속 **ID/PW**는 **"A380 운항승무팀 소통채널" Google Chat**을 통해 배포됩니다.

### 💻 오프라인 사용 지원
- Ruffle 에뮬레이션 엔진을 앱 내부에 내장하도록 업데이트하였습니다.
- **인터넷이 연결되지 않은 환경**에서도 로컬(LOCAL) 파일을 이용한 학습이 가능합니다.

### 🔄 기존 설치 사용자 업데이트 방법
> 이미 앱을 설치하신 분들은 재설치 없이 아래 방법으로 업데이트할 수 있습니다.

1. **인터넷이 연결된 상태**에서 앱을 실행합니다.
2. **새로고침(F5 또는 Cmd+R)** 을 한 번 눌러주세요.
3. 완료! 이후부터는 인터넷 없이도 사용 가능합니다.

### ⚠️ VPS 트래픽 사용 안내
> 개인 서버(VPS)의 **월별 트래픽 한도**가 있습니다.
> **IMPORT_REMOTE(온라인 파일 로딩)는 최소한으로 사용**해 주시고, 가능하면 로컬(LOCAL)에 파일을 저장하여 학습해 주세요. (^^;;)

---

## 🌟 프로젝트 개요
기존의 플래시(Flash) 기반 교육 자료는 특정 운영체제나 브라우저 환경에서 실행하기 어렵다는 기술적 한계가 있었습니다. 본 프로젝트는 최신 웹 표준 기술과 **Ruffle** 에뮬레이션 엔진을 결합하여, 별도의 플러그인 설치 없이 **iPad, 태블릿, 모바일 기기 및 PC** 등 모든 플랫폼에서 고해상도 A380 CBT를 원활하게 학습할 수 있도록 최적화된 환경을 제공합니다.

## 🚀 주요 기능
- **Platform Agnostic (기기 무관)**: 운영체제에 상관없이 최신 브라우저만 있다면 어디서든 학습 가능.
- **Modern Flash Emulation**: Ruffle 오픈 소스 엔진을 앱 내부에 내장하여 인터넷 없이도 레거시 .swf 파일을 현대적인 환경에서 안전하게 재생.
- **Virtual File System (VFS_SYNC)**: 복잡한 내부 경로와 외부 데이터 파일 로딩 구조를 실시간으로 가로채어 브라우저 메모리 내에서 완벽하게 동기화.
- **IMPORT_REMOTE**: 전용 보안 서버(airbus380cbt.com)에 저장된 CBT 파일을 ID/PW 인증 후 직접 스트리밍.
- **Offline Support (오프라인 지원)**: 첫 접속 후 서비스 워커(PWA)가 앱 전체를 캐시하여, 이후에는 인터넷 없이도 로컬 파일로 학습 가능.
- **PWA (Progressive Web App)**: "홈 화면에 추가" 기능을 통해 설치형 앱과 동일한 전체 화면(Fullscreen) 모드와 몰입감 있는 학습 경험 제공.
- **Flight Crew Optimized UI**: 항공기 조작 패널의 시인성을 고려한 다크 모드 인터페이스 및 직관적인 파일 관리 시스템.

## 🛠 기술 스택
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Emulation Engine**: Ruffle (WebAssembly — 앱 내장 번들)
- **Backend Service**: Firebase (Auth/Config)
- **File Server**: Nginx on IONOS VPS / Cloudflare SSL (airbus380cbt.com)
- **DevOps**: GitHub Actions (CI/CD) & GitHub Pages Deployment

## 📱 기기별 최적화 사용법

### 🔗 노션(Notion) & 옵시디안(Obsidian) 연동
본 앱은 **URL 파라미터(`?url=`)**를 통한 자동 로딩 기능을 지원하므로, 노션이나 옵시디안에서 학습 대시보드를 구축하기에 적합합니다.
- **Deep Link**: 특정 CBT ZIP 파일이 즉시 로드되는 링크를 생성하여 노션 데이터베이스에 저장할 수 있습니다.
- **Obsidian Embedding**: `<iframe src="https://flyingjet777.github.io/A380-CBT-VIEWER/?url=파일주소" ...></iframe>`를 통해 개인 노트 안에서 직접 학습이 가능합니다.

### iPad / iPhone (Safari 권장)
1. Safari 브라우저에서 배포된 URL([https://flyingjet777.github.io/A380-CBT-VIEWER/](https://flyingjet777.github.io/A380-CBT-VIEWER/))에 접속합니다.
2. 브라우저 하단의 **공유(Share)** 버튼을 누릅니다.
3. 목록에서 **'홈 화면에 추가(Add to Home Screen)'**를 선택합니다.
4. 바탕화면에 생성된 **'A380 CBT'** 아이콘을 통해 실행하면 주소창이 없는 앱 모드로 실행됩니다.

### PC / Desktop (Chrome/Edge)
1. 브라우저 주소창 우측에 나타나는 **'앱 설치'** 아이콘을 클릭합니다.
2. 독립된 창으로 실행되어 더 넓은 화면에서 고해상도로 학습하실 수 있습니다.

## 📂 개발 및 배포 가이드
- 본 리포지토리의 `main` 브랜치에 코드가 푸시되면 자동으로 GitHub Actions가 작동하여 `dist` 빌드 결과물을 생성하고 GitHub Pages로 배포합니다.
- 로컬 환경 실행: `npm install` -> `npm run dev`

---
*본 애플리케이션은 아시아나항공 운항훈련팀 A380 전환 교육생의 학습 편의를 목적으로 개발되었습니다.*
