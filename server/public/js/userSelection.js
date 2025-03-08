function confirmUserSelection() {
  const modal = document.getElementById('assignUsersModal');
  const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
  const selectedUsersDiv = document.getElementById('selectedUsers');
  const form = document.querySelector('form[action="/todos"]');
  
  // 清空已选用户显示区域和之前的隐藏字段
  selectedUsersDiv.innerHTML = '';
  form.querySelectorAll('input[name="assigned_to[]"]').forEach(input => input.remove());
  
  // 获取所有选中的用户
  const selectedUsers = [];
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const username = checkbox.parentElement.textContent.trim();
      selectedUsers.push({
        id: checkbox.value,
        name: username
      });
      
      // 创建用户标签
      const badge = document.createElement('span');
      badge.className = 'badge bg-primary me-1 mb-1';
      badge.textContent = username;
      selectedUsersDiv.appendChild(badge);
      
      // 创建隐藏的表单字段
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'assigned_to[]';
      hiddenInput.value = checkbox.value;
      form.appendChild(hiddenInput);
    }
  });
  
  // 关闭模态框
  const modalInstance = bootstrap.Modal.getInstance(modal);
  modalInstance.hide();
}