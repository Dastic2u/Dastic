/**
 * Translations for Dastic's visible UI.
 *
 * Console and diagnostic output is deliberately NOT translated: those logs are
 * the primary tool for diagnosing a user's problem remotely, and a log in a
 * language the maintainer cannot read is worse than no log. Everything a user
 * actually reads on screen is here.
 *
 * English is the base and the fallback. A missing key in any other language
 * falls back to English rather than rendering the raw key, so a partial
 * translation degrades to a mixed-language UI instead of a broken one.
 */
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
];

const STRINGS = {
  en: {
    'app.tagline': 'Multi-wallet NACKL miner',
    'launcher.noWallets': 'No wallets yet',
    'launcher.addPrompt': 'Add a wallet below to get started',
    'launcher.addWallet': '+ Add Wallet',
    'launcher.walletNamePlaceholder': 'Enter wallet name...',
    'launcher.launch': 'Launch',
    'launcher.stop': 'Stop',
    'launcher.sessions': 'Sessions:',
    'launcher.taps': 'Taps:',
    'launcher.donateBody': 'Support development by sending NACKL to the address below. Click to copy.',
    'launcher.copied': 'Copied to clipboard!',
    'launcher.close': 'Close',
    'launcher.mining': 'Mining',
    'launcher.idle': 'Idle',

    'connect.title': 'Connect Wallet',
    'connect.heading': 'Connect to Acki Nacki Mainnet',
    'connect.blurb': 'Pair your Acki Nacki Wallet to start mining. This is a one-time setup per wallet.',
    'connect.walletLabel': 'Acki Nacki Wallet',
    'connect.walletHint': 'The name you use to log into your Acki Nacki Wallet app.',
    'connect.scanAbove': 'Scan this code with your',
    'connect.scanBelow': 'app, or tap the link below on mobile.',
    'connect.qrUnavailable': 'QR unavailable - check console',
    'connect.connected': 'Connected to Mainnet',
    'connect.connecting': 'Connecting to Acki Nacki mainnet...',
    'connect.generatingKeys': 'Generating mining keys...',
    'connect.waitingWallet': 'Waiting for confirmation in your wallet...',
    'connect.stillWaiting': 'Still waiting on the wallet...',
    'connect.scanAgain': 'Scan Again',
    'connect.reconnect': 'Reconnect Wallet',
    'connect.failed': 'Reconnect failed.',
    'connect.status': 'Wallet Status',

    'mine.start': 'Start Mining',
    'mine.stop': 'Stop Mining',
    'mine.ready': 'Ready to mine',
    'mine.mining': 'Mining...',
    'mine.idle': 'Idle',
    'mine.syncing': 'Syncing to the tap window...',
    'mine.timedOut': 'Session timed out - starting fresh',
    'mine.capFilled': 'Daily allowance filled - {taps} taps',
    'mine.networkDown': 'Network down {secs}s - accumulating',
    'mine.heldForNetwork': 'Held for the network',

    'stat.lockedBalance': 'Locked Balance (NACKL)',
    'stat.minedLocked': 'mined - locked',
    'stat.minedLockedUnlocked': 'mined - locked / {amount} unlocked',
    'stat.tapsThisSession': 'Taps On Chain This Session',
    'stat.acceptedAllTime': 'accepted all time',
    'stat.tapsPerEpoch': 'Total Taps Per Epoch (Daily)',
    'stat.resetsWithEpoch': 'resets with the 24h epoch',
    'stat.capReached': 'daily cap reached - resumes at epoch reset',
    'stat.sessions': 'Sessions',
    'stat.mined': 'mined',

    'flow.computing': 'Computing',
    'flow.submitting': 'Submitting',
    'flow.finished': 'Finished',
    'flow.root': 'root',
    'flow.proof': 'proof',
    'flow.accepted': 'accepted',
    'flow.rejected': 'rejected',
    'flow.pending': 'pending',
    'flow.onChain': 'on chain',

    'epoch.nextWindow': 'Next tap window in',
    'epoch.resetsIn': 'Epoch resets in',
    'epoch.waitingFirstRead': 'Waiting for the first on-chain epoch read...',

    'payout.title': 'Mining Payouts',
    'payout.thisEpoch': 'this 24h epoch',
    'payout.none': 'No mining payouts yet this epoch.',
    'payout.noneYet': 'no payouts yet',
    'payout.noneThisEpoch': 'none yet this epoch',
    'payout.unavailable': 'history unavailable',
    'payout.summary': '{count} payouts / {total} NACKL / last {mins}m ago',
    'payout.earlier': '+ {count} earlier payouts this epoch',

    'settings.title': 'Settings',
    'settings.tapsPerBurst': 'Taps per Burst',
    'settings.secondsBetweenTaps': 'Seconds Between Taps',
    'settings.auto': 'Auto',
    'settings.save': 'Save',
    'settings.language': 'Language',

    'net.checking': 'Checking network...',
    'net.stable': 'Network stable - mainnet responding',
    'net.unstable': 'Network unstable - {count} failed reads, retrying',
    'net.down': 'Network down - {secs}s / not submitting',
  },

  ru: {
    'app.tagline': 'Мультикошельковый майнер NACKL',
    'launcher.noWallets': 'Кошельков пока нет',
    'launcher.addPrompt': 'Добавьте кошелёк ниже, чтобы начать',
    'launcher.addWallet': '+ Добавить кошелёк',
    'launcher.walletNamePlaceholder': 'Введите имя кошелька...',
    'launcher.launch': 'Запустить',
    'launcher.stop': 'Остановить',
    'launcher.sessions': 'Сессии:',
    'launcher.taps': 'Тапы:',
    'launcher.donateBody': 'Поддержите разработку, отправив NACKL на адрес ниже. Нажмите, чтобы скопировать.',
    'launcher.copied': 'Скопировано в буфер обмена!',
    'launcher.close': 'Закрыть',
    'launcher.mining': 'Майнинг',
    'launcher.idle': 'Ожидание',

    'connect.title': 'Подключить кошелёк',
    'connect.heading': 'Подключение к Acki Nacki Mainnet',
    'connect.blurb': 'Свяжите свой кошелёк Acki Nacki, чтобы начать майнинг. Это одноразовая настройка для каждого кошелька.',
    'connect.walletLabel': 'Кошелёк Acki Nacki',
    'connect.walletHint': 'Имя, которое вы используете для входа в приложение Acki Nacki Wallet.',
    'connect.scanAbove': 'Отсканируйте этот код в приложении',
    'connect.scanBelow': 'или нажмите на ссылку ниже на мобильном устройстве.',
    'connect.qrUnavailable': 'QR недоступен - проверьте консоль',
    'connect.connected': 'Подключено к Mainnet',
    'connect.connecting': 'Подключение к Acki Nacki mainnet...',
    'connect.generatingKeys': 'Создание ключей майнинга...',
    'connect.waitingWallet': 'Ожидание подтверждения в кошельке...',
    'connect.stillWaiting': 'Всё ещё ждём кошелёк...',
    'connect.scanAgain': 'Сканировать снова',
    'connect.reconnect': 'Переподключить кошелёк',
    'connect.failed': 'Переподключение не удалось.',
    'connect.status': 'Статус кошелька',

    'mine.start': 'Начать майнинг',
    'mine.stop': 'Остановить майнинг',
    'mine.ready': 'Готов к майнингу',
    'mine.mining': 'Майнинг...',
    'mine.idle': 'Ожидание',
    'mine.syncing': 'Синхронизация с окном тапов...',
    'mine.timedOut': 'Сессия истекла - начинаем заново',
    'mine.capFilled': 'Дневной лимит выполнен - {taps} тапов',
    'mine.networkDown': 'Сеть недоступна {secs}с - накопление',
    'mine.heldForNetwork': 'Отложено из-за сети',

    'stat.lockedBalance': 'Заблокированный баланс (NACKL)',
    'stat.minedLocked': 'намайнено - заблокировано',
    'stat.minedLockedUnlocked': 'намайнено - заблокировано / {amount} доступно',
    'stat.tapsThisSession': 'Тапов в сети за сессию',
    'stat.acceptedAllTime': 'принято за всё время',
    'stat.tapsPerEpoch': 'Всего тапов за эпоху (сутки)',
    'stat.resetsWithEpoch': 'сбрасывается вместе с 24-часовой эпохой',
    'stat.capReached': 'дневной лимит достигнут - возобновится после сброса эпохи',
    'stat.sessions': 'Сессии',
    'stat.mined': 'намайнено',

    'flow.computing': 'Вычисление',
    'flow.submitting': 'Отправка',
    'flow.finished': 'Готово',
    'flow.root': 'корень',
    'flow.proof': 'доказательство',
    'flow.accepted': 'принято',
    'flow.rejected': 'отклонено',
    'flow.pending': 'в ожидании',
    'flow.onChain': 'в сети',

    'epoch.nextWindow': 'Следующее окно тапов через',
    'epoch.resetsIn': 'Эпоха сбросится через',
    'epoch.waitingFirstRead': 'Ожидание первого чтения эпохи из сети...',

    'payout.title': 'Выплаты за майнинг',
    'payout.thisEpoch': 'за эту 24-часовую эпоху',
    'payout.none': 'Выплат за эту эпоху пока нет.',
    'payout.noneYet': 'выплат пока нет',
    'payout.noneThisEpoch': 'в эту эпоху пока нет',
    'payout.unavailable': 'история недоступна',
    'payout.summary': 'выплат: {count} / {total} NACKL / последняя {mins} мин назад',
    'payout.earlier': '+ ещё {count} выплат за эту эпоху',

    'settings.title': 'Настройки',
    'settings.tapsPerBurst': 'Тапов за серию',
    'settings.secondsBetweenTaps': 'Секунд между тапами',
    'settings.auto': 'Авто',
    'settings.save': 'Сохранить',
    'settings.language': 'Язык',

    'net.checking': 'Проверка сети...',
    'net.stable': 'Сеть стабильна - mainnet отвечает',
    'net.unstable': 'Сеть нестабильна - неудачных чтений: {count}, повтор',
    'net.down': 'Сеть недоступна - {secs}с / отправка приостановлена',
  },

  zh: {
    'app.tagline': '多钱包 NACKL 矿工',
    'launcher.noWallets': '暂无钱包',
    'launcher.addPrompt': '在下方添加钱包即可开始',
    'launcher.addWallet': '+ 添加钱包',
    'launcher.walletNamePlaceholder': '输入钱包名称...',
    'launcher.launch': '启动',
    'launcher.stop': '停止',
    'launcher.sessions': '会话：',
    'launcher.taps': '点击数：',
    'launcher.donateBody': '通过向下方地址发送 NACKL 支持开发。点击即可复制。',
    'launcher.copied': '已复制到剪贴板！',
    'launcher.close': '关闭',
    'launcher.mining': '挖矿中',
    'launcher.idle': '空闲',

    'connect.title': '连接钱包',
    'connect.heading': '连接到 Acki Nacki 主网',
    'connect.blurb': '配对您的 Acki Nacki 钱包即可开始挖矿。每个钱包只需设置一次。',
    'connect.walletLabel': 'Acki Nacki 钱包',
    'connect.walletHint': '您登录 Acki Nacki 钱包应用所用的名称。',
    'connect.scanAbove': '请使用以下应用扫描此二维码',
    'connect.scanBelow': '或在手机上点击下方链接。',
    'connect.qrUnavailable': '二维码不可用 - 请查看控制台',
    'connect.connected': '已连接到主网',
    'connect.connecting': '正在连接 Acki Nacki 主网...',
    'connect.generatingKeys': '正在生成挖矿密钥...',
    'connect.waitingWallet': '等待钱包确认...',
    'connect.stillWaiting': '仍在等待钱包...',
    'connect.scanAgain': '重新扫描',
    'connect.reconnect': '重新连接钱包',
    'connect.failed': '重新连接失败。',
    'connect.status': '钱包状态',

    'mine.start': '开始挖矿',
    'mine.stop': '停止挖矿',
    'mine.ready': '准备挖矿',
    'mine.mining': '挖矿中...',
    'mine.idle': '空闲',
    'mine.syncing': '正在同步点击窗口...',
    'mine.timedOut': '会话超时 - 重新开始',
    'mine.capFilled': '每日额度已满 - {taps} 次点击',
    'mine.networkDown': '网络中断 {secs} 秒 - 正在累积',
    'mine.heldForNetwork': '因网络暂缓',

    'stat.lockedBalance': '锁定余额 (NACKL)',
    'stat.minedLocked': '已挖出 - 锁定中',
    'stat.minedLockedUnlocked': '已挖出 - 锁定中 / {amount} 可用',
    'stat.tapsThisSession': '本次会话链上点击数',
    'stat.acceptedAllTime': '累计已接受',
    'stat.tapsPerEpoch': '每周期（每日）总点击数',
    'stat.resetsWithEpoch': '随 24 小时周期重置',
    'stat.capReached': '已达每日上限 - 周期重置后恢复',
    'stat.sessions': '会话',
    'stat.mined': '已挖出',

    'flow.computing': '计算中',
    'flow.submitting': '提交中',
    'flow.finished': '已完成',
    'flow.root': '根',
    'flow.proof': '证明',
    'flow.accepted': '已接受',
    'flow.rejected': '已拒绝',
    'flow.pending': '待处理',
    'flow.onChain': '链上',

    'epoch.nextWindow': '下个点击窗口',
    'epoch.resetsIn': '周期重置倒计时',
    'epoch.waitingFirstRead': '等待首次链上周期读取...',

    'payout.title': '挖矿收益',
    'payout.thisEpoch': '本 24 小时周期',
    'payout.none': '本周期暂无挖矿收益。',
    'payout.noneYet': '暂无收益',
    'payout.noneThisEpoch': '本周期暂无',
    'payout.unavailable': '历史记录不可用',
    'payout.summary': '{count} 笔收益 / {total} NACKL / 最近 {mins} 分钟前',
    'payout.earlier': '+ 本周期另有 {count} 笔收益',

    'settings.title': '设置',
    'settings.tapsPerBurst': '每轮点击数',
    'settings.secondsBetweenTaps': '点击间隔秒数',
    'settings.auto': '自动',
    'settings.save': '保存',
    'settings.language': '语言',

    'net.checking': '正在检查网络...',
    'net.stable': '网络稳定 - 主网响应正常',
    'net.unstable': '网络不稳定 - {count} 次读取失败，正在重试',
    'net.down': '网络中断 - {secs} 秒 / 暂停提交',
  },

  es: {
    'app.tagline': 'Minero NACKL multi-billetera',
    'launcher.noWallets': 'Aún no hay billeteras',
    'launcher.addPrompt': 'Añade una billetera abajo para empezar',
    'launcher.addWallet': '+ Añadir billetera',
    'launcher.walletNamePlaceholder': 'Escribe el nombre de la billetera...',
    'launcher.launch': 'Iniciar',
    'launcher.stop': 'Detener',
    'launcher.sessions': 'Sesiones:',
    'launcher.taps': 'Toques:',
    'launcher.donateBody': 'Apoya el desarrollo enviando NACKL a la dirección de abajo. Haz clic para copiar.',
    'launcher.copied': '¡Copiado al portapapeles!',
    'launcher.close': 'Cerrar',
    'launcher.mining': 'Minando',
    'launcher.idle': 'Inactivo',

    'connect.title': 'Conectar billetera',
    'connect.heading': 'Conectar a Acki Nacki Mainnet',
    'connect.blurb': 'Vincula tu billetera Acki Nacki para empezar a minar. Es una configuración única por billetera.',
    'connect.walletLabel': 'Billetera Acki Nacki',
    'connect.walletHint': 'El nombre que usas para entrar en tu app Acki Nacki Wallet.',
    'connect.scanAbove': 'Escanea este código con tu app',
    'connect.scanBelow': 'o toca el enlace de abajo en el móvil.',
    'connect.qrUnavailable': 'QR no disponible - revisa la consola',
    'connect.connected': 'Conectado a Mainnet',
    'connect.connecting': 'Conectando a Acki Nacki mainnet...',
    'connect.generatingKeys': 'Generando claves de minería...',
    'connect.waitingWallet': 'Esperando confirmación en tu billetera...',
    'connect.stillWaiting': 'Seguimos esperando a la billetera...',
    'connect.scanAgain': 'Escanear de nuevo',
    'connect.reconnect': 'Reconectar billetera',
    'connect.failed': 'Falló la reconexión.',
    'connect.status': 'Estado de la billetera',

    'mine.start': 'Empezar a minar',
    'mine.stop': 'Detener minería',
    'mine.ready': 'Listo para minar',
    'mine.mining': 'Minando...',
    'mine.idle': 'Inactivo',
    'mine.syncing': 'Sincronizando con la ventana de toques...',
    'mine.timedOut': 'Sesión agotada - empezando de nuevo',
    'mine.capFilled': 'Cupo diario completo - {taps} toques',
    'mine.networkDown': 'Red caída {secs}s - acumulando',
    'mine.heldForNetwork': 'En espera por la red',

    'stat.lockedBalance': 'Saldo bloqueado (NACKL)',
    'stat.minedLocked': 'minado - bloqueado',
    'stat.minedLockedUnlocked': 'minado - bloqueado / {amount} disponible',
    'stat.tapsThisSession': 'Toques en cadena esta sesión',
    'stat.acceptedAllTime': 'aceptados en total',
    'stat.tapsPerEpoch': 'Toques totales por época (diaria)',
    'stat.resetsWithEpoch': 'se reinicia con la época de 24 h',
    'stat.capReached': 'cupo diario alcanzado - se reanuda al reiniciar la época',
    'stat.sessions': 'Sesiones',
    'stat.mined': 'minado',

    'flow.computing': 'Calculando',
    'flow.submitting': 'Enviando',
    'flow.finished': 'Terminado',
    'flow.root': 'raíz',
    'flow.proof': 'prueba',
    'flow.accepted': 'aceptado',
    'flow.rejected': 'rechazado',
    'flow.pending': 'pendiente',
    'flow.onChain': 'en cadena',

    'epoch.nextWindow': 'Próxima ventana de toques en',
    'epoch.resetsIn': 'La época se reinicia en',
    'epoch.waitingFirstRead': 'Esperando la primera lectura de época en cadena...',

    'payout.title': 'Pagos de minería',
    'payout.thisEpoch': 'esta época de 24 h',
    'payout.none': 'Aún no hay pagos de minería en esta época.',
    'payout.noneYet': 'aún sin pagos',
    'payout.noneThisEpoch': 'ninguno aún en esta época',
    'payout.unavailable': 'historial no disponible',
    'payout.summary': '{count} pagos / {total} NACKL / último hace {mins} min',
    'payout.earlier': '+ {count} pagos anteriores en esta época',

    'settings.title': 'Ajustes',
    'settings.tapsPerBurst': 'Toques por ráfaga',
    'settings.secondsBetweenTaps': 'Segundos entre toques',
    'settings.auto': 'Auto',
    'settings.save': 'Guardar',
    'settings.language': 'Idioma',

    'net.checking': 'Comprobando la red...',
    'net.stable': 'Red estable - mainnet responde',
    'net.unstable': 'Red inestable - {count} lecturas fallidas, reintentando',
    'net.down': 'Red caída - {secs}s / sin enviar',
  },
};

/**
 * Icons live here, not in the translations.
 *
 * An emoji means the same thing in every language, so duplicating it across
 * four string tables would be four places to forget it. t() prepends the icon
 * for a key, which also means a translator never has to preserve one -- and
 * can never accidentally drop or mangle it.
 */
const ICONS = {
  'launcher.launch': '⛏️',
  'launcher.stop': '⏹',
  'launcher.mining': '⛏️',
  'launcher.idle': '💤',
  'launcher.copied': '✓',
  'connect.title': '🔗',
  'connect.connected': '✅',
  'connect.scanAgain': '🔄',
  'connect.reconnect': '🔄',
  'connect.status': '🔐',
  'mine.start': '▶',
  'mine.stop': '⏹',
  'mine.mining': '⛏️',
  'mine.idle': '💤',
  'mine.syncing': '🌐',
  'mine.timedOut': '💀',
  'mine.capFilled': '✅',
  'mine.networkDown': '📡',
  'mine.heldForNetwork': '📥',
  'flow.computing': '⚙️',
  'flow.submitting': '📤',
  'flow.finished': '✅',
  'epoch.nextWindow': '⏱️',
  'epoch.resetsIn': '🗓️',
  'payout.title': '💰',
  'settings.title': '⚙️',
  'settings.tapsPerBurst': '⛏️',
  'settings.secondsBetweenTaps': '⏱️',
  'settings.language': '🌐',
};

const LANG_KEY = 'bee_language';

function currentLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch (e) { /* localStorage unavailable - fall through to English */ }
  return 'en';
}

function setLang(code) {
  if (!STRINGS[code]) return false;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) { return false; }
  return true;
}

/**
 * Translate `key`, substituting {placeholders} from `params`.
 * Falls back to English, then to the key itself, so a missing entry can never
 * blank out a label.
 */
function t(key, params) {
  const lang = currentLang();
  let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  if (params) s = s.replace(/\{(\w+)\}/g, function (m, name) {
    return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
  });
  return ICONS[key] ? ICONS[key] + ' ' + s : s;
}

/**
 * Apply translations to any element carrying data-i18n / data-i18n-placeholder.
 * Safe to call repeatedly.
 */
function applyTranslations(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

/** Populate a <select> with the available languages and wire it up. */
function buildLanguageSelect(selectEl, onChange) {
  if (!selectEl) return;
  selectEl.innerHTML = LANGUAGES.map(function (l) {
    return '<option value="' + l.code + '">' + l.label + '</option>';
  }).join('');
  selectEl.value = currentLang();
  selectEl.addEventListener('change', function () {
    if (setLang(selectEl.value)) {
      applyTranslations();
      if (typeof onChange === 'function') onChange(selectEl.value);
    }
  });
}

module.exports = {
  LANGUAGES, STRINGS, t, currentLang, setLang, applyTranslations, buildLanguageSelect,
};
