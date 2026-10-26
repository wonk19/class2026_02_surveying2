from pathlib import Path
import csv, json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# 고정 난수로 만드는 교육용 합성자료. 실제 관측자료가 아니다.
rng = np.random.default_rng(2026)
ndvi = np.linspace(0.12, 0.82, 36)
lst = 37.0 - 11.0 * ndvi + rng.normal(0, 1.1, len(ndvi))
region = np.where(ndvi < 0.45, 'Lower greenness', 'Higher greenness')
rows = [dict(sample_id=f'DEMO_{i+1:02d}', ndvi=float(x), lst_c=float(y), group=str(g))
        for i, (x,y,g) in enumerate(zip(ndvi,lst,region))]
root = Path(__file__).resolve().parents[1] if '__file__' in globals() else Path.cwd()
result_dir = root/'03_분석결과'; figure_dir = root/'docs'/'figures'
result_dir.mkdir(parents=True,exist_ok=True); figure_dir.mkdir(parents=True,exist_ok=True)
with (result_dir/'synthetic_samples.csv').open('w',newline='',encoding='utf-8') as f:
    writer = csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
r = float(np.corrcoef(ndvi,lst)[0,1]); coef=np.polyfit(ndvi,lst,1)
means={str(g):float(lst[region==g].mean()) for g in np.unique(region)}
summary=dict(data_type='SYNTHETIC_NOT_LANDSAT',n=len(rows),pearson_r=r,
             slope_per_ndvi=float(coef[0]),group_means_c=means,seed=2026)
(result_dir/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
plt.rcParams.update({'font.size':11,'axes.spines.top':False,'axes.spines.right':False,
                     'axes.labelcolor':'#203530','text.color':'#203530'})
fig,ax=plt.subplots(figsize=(9,5),layout='constrained')
ax.scatter(ndvi,lst,c=ndvi,cmap='YlGn',edgecolors='#40654c',linewidths=.6,s=62,zorder=3)
ax.plot(ndvi,np.polyval(coef,ndvi),color='#146d57',lw=1.6,label=f'Linear fit; r = {r:.2f}')
ax.set(xlabel='NDVI (synthetic)',ylabel='LST (°C, synthetic)',title='Greenness and surface temperature')
ax.grid(alpha=.18);ax.legend(frameon=False)
fig.text(.5,-.06,'TEACHING DEMO · SYNTHETIC DATA · NOT AN OBSERVED RESULT',ha='center',fontsize=9,color='#845c19')
fig.savefig(figure_dir/'ndvi_lst.png',dpi=170,bbox_inches='tight');plt.close(fig)
fig,ax=plt.subplots(figsize=(9,4.5),layout='constrained')
labels=['Lower greenness','Higher greenness'];vals=[means[g] for g in labels]
ax.bar(labels,vals,color=['#b6c9b1','#2e8060'],width=.52)
for i,v in enumerate(vals):ax.text(i,v+.3,f'{v:.1f} °C',ha='center',fontweight='bold')
ax.set(ylim=(0,40),ylabel='Mean LST (°C, synthetic)',title='A comparison within the simulated sample')
ax.grid(axis='y',alpha=.18);ax.set_axisbelow(True)
fig.text(.5,-.06,'TEACHING DEMO · NOT A CAUSAL EFFECT ESTIMATE',ha='center',fontsize=9,color='#845c19')
fig.savefig(figure_dir/'group_means.png',dpi=170,bbox_inches='tight');plt.close(fig)
print(json.dumps(summary,ensure_ascii=False,indent=2))
