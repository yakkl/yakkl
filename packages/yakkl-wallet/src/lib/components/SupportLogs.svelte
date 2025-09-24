<script lang="ts">
  import { onMount } from 'svelte';
  import { log } from '$lib/common/logger-wrapper';

  type LevelOption = { label: string; value: number };
  const levels: LevelOption[] = [
    { label: 'TRACE (0)', value: 0 },
    { label: 'DEBUG (1)', value: 1 },
    { label: 'INFO (2)', value: 2 },
    { label: 'WARN (3)', value: 3 },
    { label: 'ERROR (4)', value: 4 },
    { label: 'FATAL (5)', value: 5 }
  ];

  let levelAtLeast: number = 1; // default DEBUG+
  let textIncludes: string = '';
  let limit = 200;
  let offset = 0;
  let startTimeStr = '';
  let endTimeStr = '';
  let working = false;
  let errorMsg = '';
  let logsText = '';
  let logsList: any[] = [];

  function toDate(value: string): number | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.getTime();
  }

  async function refresh() {
    try {
      working = true; errorMsg = '';
      const opts: any = {
        levelAtLeast,
        textIncludes: textIncludes ? textIncludes : undefined,
        limit: limit || undefined,
        offset: offset || undefined,
        startTime: toDate(startTimeStr),
        endTime: toDate(endTimeStr)
      };
      const list = await (log.getPersistedLogs?.() ?? Promise.resolve([]));
      // If wrapper returns raw list, we can render it; also compute a text export
      logsList = list;
      logsText = await (log.copyLogs?.(opts) ?? Promise.resolve(''));
    } catch (e: any) {
      errorMsg = String(e?.message ?? e);
    } finally {
      working = false;
    }
  }

  async function doCopy() {
    try {
      working = true; errorMsg = '';
      const text = logsText || (await (log.copyLogs?.({
        levelAtLeast,
        textIncludes: textIncludes ? textIncludes : undefined,
        limit: limit || undefined,
        offset: offset || undefined,
        startTime: toDate(startTimeStr),
        endTime: toDate(endTimeStr)
      }) ?? Promise.resolve('')));
      await navigator.clipboard.writeText(text);
    } catch (e: any) {
      errorMsg = 'Copy failed: ' + String(e?.message ?? e);
    } finally {
      working = false;
    }
  }

  async function clearLogs() {
    try {
      working = true; errorMsg = '';
      await (log.clearPersistedLogs?.() ?? Promise.resolve());
      logsList = []; logsText = '';
    } catch (e: any) {
      errorMsg = 'Clear failed: ' + String(e?.message ?? e);
    } finally {
      working = false;
    }
  }

  onMount(refresh);
</script>

<div class="support-logs">
  <h2>Support Logs</h2>

  <div class="controls">
    <label>
      Min Level
      <select bind:value={levelAtLeast} on:change={refresh}>
        {#each levels as l}
          <option value={l.value}>{l.label}</option>
        {/each}
      </select>
    </label>

    <label>
      Contains Text
      <input type="text" bind:value={textIncludes} placeholder="filter text / regex" />
    </label>

    <label>
      Start Time
      <input type="datetime-local" bind:value={startTimeStr} />
    </label>
    <label>
      End Time
      <input type="datetime-local" bind:value={endTimeStr} />
    </label>

    <label>
      Limit
      <input type="number" min="1" bind:value={limit} />
    </label>
    <label>
      Offset
      <input type="number" min="0" bind:value={offset} />
    </label>

    <button on:click={refresh} disabled={working}>Refresh</button>
    <button on:click={doCopy} disabled={working || !logsText}>Copy</button>
    <button on:click={clearLogs} disabled={working}>Clear</button>
  </div>

  {#if errorMsg}
    <div class="error">{errorMsg}</div>
  {/if}

  <h3>Preview</h3>
  <textarea readonly rows="16" style="width:100%; font-family:monospace">{logsText}</textarea>

  <h3>Entries ({logsList.length})</h3>
  <div class="list" style="max-height: 300px; overflow: auto;">
    {#each logsList as e, i}
      <div class="row">
        <code>{i + 1}.</code>
        <code>
          {#if (e.timestamp)}
            {new Date(e.timestamp).toISOString()}
          {/if}
        </code>
        <code>{String(e.level)}</code>
        <code>{String(e.message)}</code>
      </div>
    {/each}
  </div>
</div>

<style>
  .support-logs { display: flex; flex-direction: column; gap: 12px; }
  .controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: end; }
  .controls label { display: flex; flex-direction: column; font-size: 0.9rem; }
  .error { color: #b91c1c; }
  .row { display: grid; grid-template-columns: 40px 250px 90px 1fr; gap: 8px; font-family: monospace; font-size: 12px; border-bottom: 1px solid #eee; padding: 4px 0; }
</style>

