"""세 가지 심화 분석의 공통 코드. 모든 입력은 교육용 합성자료다.

실행: python 01_공통코드/advanced_analysis.py
실제 관측자료에서는 make_data()를 같은 열 구조의 자료 읽기로 교체한다.
"""
from pathlib import Path
import csv
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

SEED = 20261026
BOOTSTRAPS = 600


def make_data():
    # block은 가상의 공간 집단, site는 그 안의 지점이다. 실제 좌표는 없다.
    # 같은 지점을 봄·여름 두 번 관측한 모양으로 만들어 반복 관측을 표현한다.
    rng = np.random.default_rng(SEED)
    block = np.repeat(np.arange(24), 8)
    site = np.arange(len(block))
    greenery = rng.uniform(.15, .75, len(block))
    elevation = np.clip(30 + 220 * greenery + rng.normal(0, 45, len(block)), 0, 300)
    impervious = np.clip(.95 - greenery + rng.normal(0, .12, len(block)), .05, .95)
    coast_km = rng.uniform(.2, 12, len(block))
    block_effect = rng.normal(0, 1.3, 24)
    rows = []
    for summer in (0, 1):
        ndvi = np.clip(greenery + .04 * summer + rng.normal(0, .025, len(block)), .05, .9)
        coverage = rng.uniform(.3, 1, len(block))
        noise = rng.normal(0, .5 + 2 * (1 - coverage), len(block))
        # 계절별 기울기와 다른 환경 요인의 영향을 의도적으로 넣은 생성식.
        # 이 숫자는 현실의 냉각 효과나 문헌 추정값이 아니다.
        lst = (28 + 7 * summer - (4 + 5 * summer) * ndvi - .006 * elevation
               + 3 * impervious - .12 * coast_km + block_effect[block] + noise)
        for i in site:
            rows.append(dict(block=int(block[i]), site=int(i), summer=summer,
                             ndvi=float(ndvi[i]), elevation_m=float(elevation[i]),
                             impervious=float(impervious[i]), coast_km=float(coast_km[i]),
                             valid_fraction=float(coverage[i]), lst_c=float(lst[i])))
    return {key: np.array([row[key] for row in rows]) for key in rows[0]}


def subset(data, indices):
    # 딕셔너리의 모든 열에 같은 행 선택을 적용해 변수 간 대응을 유지한다.
    return {key: values[indices] for key, values in data.items()}


def design(data, model):
    # np.column_stack은 여러 1차원 배열을 설명변수 행렬의 열로 묶는다.
    # 모든 모델에 절편과 계절을 포함한다. 교호작용을 추가할 때 주효과도 유지한다.
    columns = [np.ones(len(data['ndvi'])), data['summer']]
    names = ['intercept', 'summer']
    if model != 'baseline':
        columns.append(data['ndvi']); names.append('ndvi')
    if model != 'simple':
        for name in ('elevation_m', 'impervious', 'coast_km'):
            columns.append(data[name]); names.append(name)
    if model == 'interaction':
        columns.append(data['ndvi'] * data['summer']); names.append('ndvi:summer')
    return np.column_stack(columns), names


def fit(data, model):
    # lstsq는 잔차제곱합을 최소화하는 OLS 계수를 반환한다. 학습 자료 내 적합이다.
    x, names = design(data, model)
    beta, _, rank, _ = np.linalg.lstsq(x, data['lst_c'], rcond=None)
    if rank != x.shape[1]:
        raise ValueError('설명변수의 선형 종속으로 계수를 유일하게 추정할 수 없습니다.')
    return beta, names, x @ beta


def slopes(beta, names):
    spring = beta[names.index('ndvi')] * .1
    difference = beta[names.index('ndvi:summer')] * .1 if 'ndvi:summer' in names else 0.
    # 기울기를 읽기 쉬운 NDVI 0.1 증가당 온도 변화(°C)로 환산한다.
    return np.array([spring, spring + difference, difference])


def estimate(data, model, seed=SEED):
    beta, names, predicted = fit(data, model)
    groups = np.unique(data['block'])
    rng = np.random.default_rng(seed)
    samples = []
    for _ in range(BOOTSTRAPS):
        # 블록 전체를 복원추출한다. 같은 지점의 두 계절도 함께 가져온다.
        # 중복 추출된 블록은 선택된 횟수만큼 모든 행을 반복해서 포함한다.
        selected = rng.choice(groups, size=len(groups), replace=True)
        indices = np.concatenate([np.flatnonzero(data['block'] == group) for group in selected])
        boot_beta, _, _ = fit(subset(data, indices), model)
        samples.append(slopes(boot_beta, names))
    samples = np.array(samples)
    interval = np.percentile(samples, [2.5, 97.5], axis=0)
    return dict(n=len(predicted), blocks=len(groups), estimate=slopes(beta, names).tolist(),
                ci_low=interval[0].tolist(), ci_high=interval[1].tolist())


def save_figure(fig, output, name):
    fig.text(.5, -.035, 'SYNTHETIC DATA ONLY | 95% block-bootstrap intervals (600 resamples)',
             ha='center', fontsize=8, color='#805c20')
    fig.savefig(output / name, dpi=170, bbox_inches='tight')
    plt.close(fig)


def forest(ax, results, labels, component=0):
    for i, result in enumerate(results):
        value = result['estimate'][component]
        # 가로선은 백분위수 구간이다. 추정값이 구간 밖에 있어도 그릴 수 있게 한다.
        ax.plot([result['ci_low'][component], result['ci_high'][component]], [i, i], color='#238264', lw=3)
        ax.scatter(value, i, color='#153d34', zorder=3)
    ax.set_yticks(range(len(labels)), labels)
    ax.axvline(0, color='#999', lw=.8)
    ax.set_xlabel('LST change per +0.1 NDVI (°C)')
    ax.grid(axis='x', alpha=.2)


def confounding(data, output):
    simple = estimate(data, 'simple')
    adjusted = estimate(data, 'adjusted')
    _, _, predicted = fit(data, 'adjusted')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), layout='constrained')
    forest(axes[0], [simple, adjusted], ['Season only', '+ Environment'])
    axes[0].set_title('1. Adjustment changes the association')
    axes[1].scatter(predicted, data['lst_c'] - predicted, s=12, alpha=.5, color='#238264')
    axes[1].axhline(0, color='#999', lw=1)
    axes[1].set(xlabel='Fitted LST (°C)', ylabel='Residual (°C)', title='Residuals: check what the model misses')
    save_figure(fig, output, 'deep_confounding.png')
    return dict(season_only=simple, adjusted=adjusted)


def seasonality(data, output):
    result = estimate(data, 'interaction')
    beta, names, _ = fit(data, 'interaction')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), layout='constrained')
    # 예측 곡선은 두 계절의 NDVI 범위가 겹치는 구간에만 그려 외삽을 줄인다.
    low = max(data['ndvi'][data['summer'] == s].min() for s in (0, 1))
    high = min(data['ndvi'][data['summer'] == s].max() for s in (0, 1))
    grid = np.linspace(low, high, 60)
    for summer, color, label in [(0, '#458b63', 'Spring'), (1, '#d07a3b', 'Summer')]:
        held = {key: np.full(len(grid), values.mean()) for key, values in data.items()}
        held['ndvi'] = grid; held['summer'] = np.full(len(grid), summer)
        x, _ = design(held, 'interaction')
        axes[0].plot(grid, x @ beta, color=color, label=label, lw=2.5)
    axes[0].set(xlabel='NDVI', ylabel='Adjusted predicted LST (°C)', title='2. Is the slope the same in both seasons?')
    axes[0].legend(frameon=False)
    # 봄·여름·차이를 각각 한 행으로 바꾸어 같은 축에서 추정 구간을 비교한다.
    parts = [{key: [result[key][j]] for key in ('estimate', 'ci_low', 'ci_high')} for j in range(3)]
    forest(axes[1], parts, ['Spring', 'Summer', 'Summer − spring'])
    axes[1].set_title('Adjusted slopes and their difference')
    save_figure(fig, output, 'deep_seasonality.png')
    return result


def cross_validate(data, grouped):
    rng = np.random.default_rng(SEED + 1)
    n = len(data['ndvi'])
    fold = np.empty(n, dtype=int)
    units = np.unique(data['block']) if grouped else np.arange(n)
    for k, held in enumerate(np.array_split(rng.permutation(units), 6)):
        mask = np.isin(data['block'], held) if grouped else np.isin(np.arange(n), held)
        fold[mask] = k
    predictions = {model: np.full(n, np.nan) for model in ('baseline', 'interaction')}
    fold_results = []
    for k in range(6):
        train, test = subset(data, fold != k), subset(data, fold == k)
        if grouped:
            assert not set(train['block']) & set(test['block']), '학습·평가 블록 중복'
            assert not set(train['site']) & set(test['site']), '학습·평가 지점 중복'
        for model in predictions:
            # 평가 자료의 LST를 학습에 쓰지 않고 동일한 분할로 두 모델을 비교한다.
            beta, _, _ = fit(train, model)
            x, _ = design(test, model)
            predictions[model][fold == k] = x @ beta
            rmse = float(np.sqrt(np.mean((test['lst_c'] - x @ beta) ** 2)))
            fold_results.append(dict(fold=k, model=model, n=len(x), rmse_c=rmse))
    pooled = {model: float(np.sqrt(np.mean((data['lst_c'] - pred) ** 2)))
              for model, pred in predictions.items()}
    assert all(np.isfinite(pred).all() for pred in predictions.values())
    return dict(pooled_rmse_c=pooled, folds=fold_results, fold_assignment=fold.tolist())


def robustness(data, output):
    sensitivity = []
    for threshold in (0., .5, .7):
        selected = subset(data, data['valid_fraction'] >= threshold)
        result = estimate(selected, 'interaction')
        result['threshold'] = threshold
        sensitivity.append(result)
    blocked = cross_validate(data, grouped=True)
    random = cross_validate(data, grouped=False)
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), layout='constrained')
    forest(axes[0], sensitivity, [f"Coverage ≥ {r['threshold']:.1f}; n={r['n']}" for r in sensitivity], component=1)
    axes[0].set_title('3. Summer slope under quality filters')
    x = np.arange(2)
    for i, (name, result, color) in enumerate([('Random rows', random, '#b4c8b8'), ('Held-out blocks', blocked, '#238264')]):
        values = [result['pooled_rmse_c'][model] for model in ('baseline', 'interaction')]
        bars = axes[1].bar(x + (i - .5) * .35, values, .35, label=name, color=color)
        axes[1].bar_label(bars, fmt='%.2f', padding=3, fontsize=9)
    axes[1].set_xticks(x, ['Environment + season', '+ NDVI × season'])
    axes[1].set(ylabel='Out-of-fold RMSE (°C)', title='Prediction on unseen data (6 folds)')
    axes[1].set_ylim(0, max(max(r['pooled_rmse_c'].values()) for r in (random, blocked)) * 1.35)
    axes[1].legend(frameon=False, fontsize=9)
    save_figure(fig, output, 'deep_robustness.png')
    return dict(sensitivity=sensitivity, blocked_cv=blocked, random_row_cv=random)


def main(root=None):
    root = Path(root) if root else Path(__file__).resolve().parents[1]
    output = root / 'docs' / 'figures'; output.mkdir(parents=True, exist_ok=True)
    results = root / '03_분석결과'; results.mkdir(parents=True, exist_ok=True)
    data = make_data()
    with (results / 'advanced_synthetic_samples.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f); writer.writerow(data.keys()); writer.writerows(zip(*data.values()))
    plt.rcParams.update({'axes.spines.top': False, 'axes.spines.right': False, 'font.size': 10})
    summary = dict(data_type='SYNTHETIC_NOT_LANDSAT', seed=SEED, bootstrap_resamples=BOOTSTRAPS,
                   n=len(data['ndvi']), sites=len(np.unique(data['site'])), blocks=len(np.unique(data['block'])),
                   confounding=confounding(data, output), seasonality=seasonality(data, output),
                   robustness=robustness(data, output))
    (results / 'advanced_summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps({key: summary[key] for key in ('n', 'sites', 'blocks', 'confounding', 'seasonality')}, indent=2))
    return summary


if __name__ == '__main__':
    main()
