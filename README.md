# 위성영상 프로젝트 · 웹보고서 예시

**학생용 공개 저장소 템플릿입니다. 모든 결과 수치는 합성자료이며, 실제 부산·Landsat 관측 결과가 아닙니다.**

- [웹보고서 보기](https://wonk19.github.io/gee-project-report-example/)
- [보고서 본문 수정](docs/index.md)
- [빈 보고서 틀](docs/report-template.md)
- [학생 사용 안내](STUDENT_GUIDE.md)
- [실행 가능한 합성자료 분석](02_개인분석/01_demo_analysis.ipynb)
- [GEE 시작 노트북](01_공통코드/01_gee_starter.ipynb) — 실제 EE 실행은 별도 인증 필요

## 조별로 시작하기
1. **Use this template → Create a new repository**로 조별 Public 저장소를 만든다.
2. Settings → Pages → Deploy from a branch → `main` / `/docs` → Save를 선택한다.
3. `docs/index.md`를 자기 조의 연구 질문과 실제 결과로 바꾼다. 빈 양식은 `docs/report-template.md`를 참고한다.
4. 그림은 `docs/figures/`에 올리고 본문에서 `![그림 설명](figures/파일명.png)`로 연결한다.
5. 코드·집계표·그림을 함께 갱신한 뒤 실제 웹보고서가 바뀌었는지 확인한다.
6. 이 README의 웹보고서 주소도 새 저장소의 Pages 주소로 바꾼다. 디자인/CSS를 수정할 필요는 없다.

## 구성
```text
README.md                       프로젝트 입구
STUDENT_GUIDE.md                 사용법·최종 제출 기준
01_공통코드/                     GEE 시작 코드와 그림 재생성 코드
02_개인분석/                     개인별 노트북
03_분석결과/                     작은 집계표·데이터 출처
04_발표자료/                     선택 사항
05_보고서양식/                   참고 양식 안내
docs/index.md                   보고서 본문: 학생이 주로 수정할 파일
docs/report-template.md         빈 보고서 틀
docs/figures/                   보고서 그림
docs/_layouts/ + assets/        공통 디자인: 수정 불필요
```

## 작업 규칙
매주 별도 보고서는 제출하지 않는다. 의미 있는 분석 결과가 생길 때 README·노트북·웹보고서를 갱신한다. 최종 제출은 웹보고서 주소와 저장소 주소이며, 발표도 웹보고서로 진행할 수 있다.

각자 다른 노트북을 편집하고, 공통 파일은 담당자가 합친다. 외부 코드·다른 조 분석을 참고하면 출처와 수정점을 기록한다. 분석 완료 여부와 실제 실행일은 직접 확인한 것만 적는다.

학생 학번·연락처·성적, 인증 토큰·서비스 계정 키는 올리지 않는다. 원본 위성영상 대신 GEE 자료 ID와 조회 조건을 기록한다.

## 재현
Python 3에서 `python -m pip install -r requirements.txt` 후 저장소 루트에서 `python 01_공통코드/make_demo.py`를 실행하면 합성 CSV와 그림 두 장을 다시 만든다. EE 계정이 필요 없다. 실행 가능한 노트북도 같은 분석을 담고 있다.

GEE 시작 노트북은 Landsat 8 장면의 LST 지도를 만드는 별도 연습이다. 웹보고서 합성 결과와 연결된 실제 관측 파이프라인이라고 주장하지 않는다.
