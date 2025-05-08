
  // Update the ClientUserInviteForm to use the correct options object when calling inviteUser
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!firstName || !lastName || !email || !selectedClient) {
        throw new Error("Please fill out all required fields");
      }
      
      const fullName = `${firstName} ${lastName}`;
      
      // Updated to pass options object instead of direct clientId
      inviteUser(email, fullName, "client", {
        clientId: selectedClient
      });
      
      setIsSuccess(true);
      setIsLoading(false);
      toast({
        title: "Success",
        description: `Invitation sent to ${fullName}`,
      });
      
      // Reset form after success
      setTimeout(() => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setSelectedClient("");
        setIsSuccess(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };
