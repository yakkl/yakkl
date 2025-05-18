<script lang="ts">
	import Modal from "./Modal.svelte";

  interface Props {
    show: boolean;
    title?: string;
    content?: string;
    rejectText?: string;
    className?: string;
    onReject?: () => void;
  }

  let {
    show = $bindable(false),
    title = 'Failed!',
    content = 'An error has occurred.',
    rejectText = 'Close',
    className = 'z-[999]',
    onReject = () => {show = false},
  }: Props = $props();
</script>

<Modal bind:show={show} title={title} {className}>
  <div class="p-6">
    <p class="text-sm text-gray-500">{content}</p>
    <div class="mt-4 flex justify-end">
      <button type="button" class="ml-2 rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" onclick={onReject}>{rejectText}</button>
    </div>
  </div>
</Modal>
