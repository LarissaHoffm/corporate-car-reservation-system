import * as React from "react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Send, ArrowLeft } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";

export default function NewReservation() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[v0] New Reservation page mounted successfully");
    console.log("[v0] Current URL:", window.location.pathname);
  }, []);

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    passengerCount: "1",
    purpose: "",
    notes: "",
    transmission: "Automatic",
    fuelType: "Any",
    vehicleClass: "Compact",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[v0] Submitting new reservation:", formData);
    navigate("/requester/reservations");
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/requester/reservations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">New Reservation</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                    <Select
                      value={formData.origin}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, origin: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue placeholder="Select origin office" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lisbon">Lisbon HQ</SelectItem>
                        <SelectItem value="porto">Porto Office</SelectItem>
                        <SelectItem value="downtown">Downtown Branch</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Choose your pickup location</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                    <Select
                      value={formData.destination}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, destination: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lisbon">Lisbon HQ</SelectItem>
                        <SelectItem value="porto">Porto Office</SelectItem>
                        <SelectItem value="airport">Airport</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Where you need to go</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={formData.departureDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, departureDate: (e.target as HTMLInputElement).value }))}
                          className="pl-10 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={formData.departureTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, departureTime: (e.target as HTMLInputElement).value }))}
                          className="pl-10 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Select date & time</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={formData.returnDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, returnDate: (e.target as HTMLInputElement).value }))}
                          className="pl-10 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={formData.returnTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, returnTime: (e.target as HTMLInputElement).value }))}
                          className="pl-10 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Select date & time</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Passengers</label>
                    <Select
                      value={formData.passengerCount}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, passengerCount: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 passenger</SelectItem>
                        <SelectItem value="2">2 passengers</SelectItem>
                        <SelectItem value="3">3 passengers</SelectItem>
                        <SelectItem value="4">4 passengers</SelectItem>
                        <SelectItem value="5">5+ passengers</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Number of passengers</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                    <Select
                      value={formData.purpose}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, purpose: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue placeholder="Project / Meeting / Client visit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="client">Client visit</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: (e.target as HTMLTextAreaElement).value }))}
                    placeholder="Any additional information about your trip..."
                    className="min-h-[100px] border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Route Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Route will be displayed here</p>
                  <p className="text-xs text-muted-foreground mt-1">Interactive map showing pickup and destination</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Vehicle Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                    <Select
                      value={formData.transmission}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, transmission: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuel</label>
                    <Select
                      value={formData.fuelType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, fuelType: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                    <Select
                      value={formData.vehicleClass}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, vehicleClass: value }))}
                    >
                      <SelectTrigger className="border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compact">Compact</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="SUV">SUV</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">Pending approval</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Duration</span>
                  <span className="font-medium text-foreground">2 days 9 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pickup/Return</span>
                  <span className="font-medium text-foreground">Lisbon HQ → Porto</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approver</span>
                  <span className="font-medium text-foreground">Assigned automatically</span>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90 py-3 mt-6 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                <Send className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
