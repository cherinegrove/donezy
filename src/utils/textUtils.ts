
/**
 * Gets the cursor coordinates in a textarea element
 */
export const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
  // Create a mirror div with same styling as textarea
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  // Copy styles from textarea to mirror div
  mirror.style.width = element.offsetWidth + 'px';
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.position = 'absolute';
  mirror.style.top = '-9999px';
  
  document.body.appendChild(mirror);
  
  // Add text content up to the caret position
  const textBeforeCaret = element.value.substring(0, position);
  mirror.textContent = textBeforeCaret;
  
  // Add a span at the end to mark the position
  const caretSpan = document.createElement('span');
  caretSpan.textContent = '|';
  mirror.appendChild(caretSpan);
  
  const caretRect = caretSpan.getBoundingClientRect();
  const textareaRect = element.getBoundingClientRect();
  
  document.body.removeChild(mirror);
  
  return {
    top: caretRect.top - textareaRect.top + element.scrollTop,
    left: caretRect.left - textareaRect.left + element.scrollLeft
  };
};
