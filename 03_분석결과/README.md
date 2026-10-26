# 분석결과의 출처

`synthetic_samples.csv`와 `summary.json`은 `01_공통코드/make_demo.py`에서 생성한다.
난수 seed: 2026. 표본: 36개 가상 관측점. 공간 좌표·실제 지역·실제 관측 날짜는 없다.
LST = 37 − 11 × NDVI + 정규 난수(표준편차 1.1)로 음의 관계를 의도적으로 넣었다.
실제 Landsat 연구 결과나 부산의 녹지 냉각 효과로 인용하지 않는다.
학생은 실제 집계표로 교체하면서 GEE 자료 ID, 기간, 지역, 필터, 표본 단위를 기록한다.


## 심화 예제
`advanced_synthetic_samples.csv`는 seed 20261026으로 생성한 별도 384행 합성자료다. 열과 생성식은 웹보고서의 심화 자료 절과 `advanced_analysis.py`에 정의되어 있다. `advanced_summary.json`은 600회 블록 bootstrap의 계수·구간, 품질 기준별 표본 수, 6-fold RMSE와 행별 fold 배정을 담는다. `fold_assignment`의 순서는 CSV 행 순서와 같다. 실제 위치·날짜·관측자료는 없다.
