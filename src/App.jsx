import { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-image-2');
  const [apiKey, setApiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState(null);

  const notify = (msg, type) => { setNotice({ msg, type }); setTimeout(() => setNotice(null), 4000); };

  const generate = async () => {
    if (!prompt.trim()) return notify('请输入提示词', 'error');
    setGenerating(true);
    try {
      var r = await fetch('/api/ps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, n: 1, response_format: 'url', apiKey: apiKey || undefined, isSimulation: !apiKey })
      });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || '生成失败');
      setResults(d.data || []);
      notify(d.isSimulation ? '仿真模式: ' + (d.simulationType || '生成成功') : 'AI 生成成功！', 'success');
    } catch (e) { notify(e.message, 'error'); }
    finally { setGenerating(false); }
  };

  var tabBtn = (id, label) =>
    React.createElement('button', {
      id: 'tab-btn-' + id,
      onClick: () => setActiveTab(id),
      className: 'flex-1 py-2 text-[11px] font-semibold tracking-wide transition-colors cursor-pointer border-0 ' +
        (activeTab === id ? 'text-white bg-white/10 rounded-lg' : 'text-gray-500 hover:text-gray-300')
    }, label);

  return React.createElement('div', { className: 'h-screen w-full bg-[#07090e] flex flex-col overflow-hidden select-none relative' },
    React.createElement('div', { className: 'absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none' }),
    React.createElement('div', { className: 'absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-indigo-950/15 blur-[120px] pointer-events-none' }),

    // Title bar
    React.createElement('div', { className: 'flex items-center justify-between h-9 bg-[#0c0d14] border-b border-white/[0.06] shrink-0', style: { WebkitAppRegion: 'drag' } },
      React.createElement('span', { className: 'text-[11px] text-gray-400 font-medium px-3 tracking-wide select-none' }, 'PS AI Fill'),
      React.createElement('div', { className: 'flex h-full', style: { WebkitAppRegion: 'no-drag' } },
        ['─', '□', '✕'].map((s, i) =>
          React.createElement('button', {
            key: i,
            onClick: () => { var a = window.electronAPI; if (a) [a.minimize(), a.maximize(), a.close()][i](); },
            className: 'w-[46px] h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10' + (i === 2 ? ' hover:bg-red-500/80' : '') + ' cursor-pointer border-0 outline-none'
          }, s)
        )
      )
    ),

    // Content
    React.createElement('div', { className: 'flex-1 flex justify-center relative' },
      React.createElement('div', { className: 'w-full max-w-[390px] h-full bg-[#0c0d14] text-gray-200 flex flex-col font-sans overflow-hidden shadow-2xl relative border-x border-white/10' },

        // Notification
        notice && React.createElement('div', {
          className: 'absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-2xl text-[11px] flex items-center gap-2.5 w-[90%] ' +
            (notice.type === 'error' ? 'bg-red-950/95 text-red-200 border border-red-500/20' : 'bg-black/95 text-white border border-white/15')
        },
          React.createElement('span', { className: 'flex-1' }, notice.msg),
          React.createElement('button', { onClick: () => setNotice(null), className: 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer border-0' }, '✕')
        ),

        // Tabs
        React.createElement('div', { className: 'flex gap-1 p-2 pb-0 shrink-0' },
          tabBtn('generate', '🎨 生成'),
          tabBtn('gallery', '🖼️ 图库'),
          tabBtn('settings', '⚙️ 设置')
        ),

        // Generate tab
        activeTab === 'generate' && React.createElement('div', { className: 'flex-1 flex flex-col p-3 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' },

          !apiKey && React.createElement('div', { className: 'bg-amber-500/15 border border-amber-500/35 rounded-xl p-3 text-[10px] text-amber-400' },
            '未设置 API Key，使用仿真模式'
          ),

          React.createElement('div', { className: 'flex flex-col gap-1.5' },
            React.createElement('span', { className: 'text-[10px] text-gray-500 font-semibold tracking-wide' }, '提示词'),
            React.createElement('textarea', {
              value: prompt,
              onChange: e => setPrompt(e.target.value),
              placeholder: '输入 AI 图像描述...',
              className: 'glass-input w-full min-h-[60px] rounded-xl px-3 py-2 text-[11px] outline-none resize-none',
              rows: 3
            })
          ),

          React.createElement('div', { className: 'flex gap-2 items-center' },
            React.createElement('div', { className: 'flex-1 flex flex-col gap-1' },
              React.createElement('span', { className: 'text-[10px] text-gray-500 font-semibold tracking-wide' }, '模型'),
              React.createElement('select', {
                value: model,
                onChange: e => setModel(e.target.value),
                className: 'glass-input rounded-xl px-2.5 py-1.5 text-[11px] outline-none cursor-pointer'
              },
                React.createElement('option', { value: 'gpt-image-2' }, 'GPT Image 2'),
                React.createElement('option', { value: 'nano-banana-pro' }, 'Nano Banana Pro'),
                React.createElement('option', { value: 'nano-banana-lite' }, 'Nano Banana Lite')
              )
            ),
            React.createElement('button', {
              onClick: generate,
              disabled: generating || !prompt.trim(),
              className: 'glass-button-primary mt-5 px-5 py-2 rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }, generating ? '生成中...' : '✨ 生成')
          ),

          results.length > 0 && React.createElement('div', { className: 'flex flex-col gap-2 mt-2' },
            React.createElement('span', { className: 'text-[10px] text-gray-500 font-semibold tracking-wide' }, '生成结果'),
            React.createElement('div', { className: 'grid grid-cols-1 gap-2' },
              results.map((img, i) =>
                React.createElement('div', { key: i, className: 'bg-white/5 rounded-xl overflow-hidden border border-white/10' },
                  React.createElement('img', { src: img.url, alt: '', className: 'w-full aspect-square object-cover' })
                )
              )
            )
          )
        ),

        // Gallery tab
        activeTab === 'gallery' && React.createElement('div', { className: 'flex-1 flex flex-col p-3 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' },
          results.length === 0
            ? React.createElement('div', { className: 'flex-1 flex items-center justify-center text-gray-600 text-[11px]' }, '还没有生成结果')
            : results.map((img, i) =>
                React.createElement('div', { key: i, className: 'bg-white/5 rounded-xl overflow-hidden border border-white/10' },
                  React.createElement('img', { src: img.url, alt: '', className: 'w-full aspect-square object-cover' })
                )
              )
        ),

        // Settings tab
        activeTab === 'settings' && React.createElement('div', { className: 'flex-1 flex flex-col p-3 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' },

          React.createElement('div', { className: 'bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2' },
            React.createElement('span', { className: 'text-[10px] text-gray-400 font-semibold tracking-wide' }, 'API Key'),
            React.createElement('input', {
              value: apiKey,
              onChange: e => setApiKey(e.target.value),
              placeholder: 'sk-...',
              type: 'password',
              className: 'glass-input w-full rounded-xl px-2.5 py-1.5 text-[11px] outline-none'
            }),
            React.createElement('span', { className: 'text-[9px] text-gray-600' }, '留空使用仿真模式')
          ),

          React.createElement('div', { className: 'bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2' },
            React.createElement('span', { className: 'text-[10px] text-gray-400 font-semibold tracking-wide' }, '关于'),
            React.createElement('span', { className: 'text-[10px] text-gray-500' }, 'PS AI Fill v1.0'),
            React.createElement('span', { className: 'text-[10px] text-gray-500' }, '基于 React 19 + Vite 6')
          )
        )
      )
    )
  );
}