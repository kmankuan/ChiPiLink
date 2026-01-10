/**
 * User Profile Component - Perfil de usuario avanzado
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Edit2, Save, X, Calendar, Phone, Mail, MapPin, Shield, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UserProfile({ token, user }) {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [userTypes, setUserTypes] = useState([]);
  const [profileFields, setProfileFields] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [customFields, setCustomFields] = useState({});

  const lang = i18n.language || 'es';

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [profileRes, typesRes, fieldsRes, relRes] = await Promise.all([
        fetch(`${API_URL}/api/users/profile/me`, { headers }),
        fetch(`${API_URL}/api/users/types`),
        fetch(`${API_URL}/api/users/fields`),
        fetch(`${API_URL}/api/users/relationships`, { headers })
      ]);

      if (typesRes.ok) {
        const data = await typesRes.json();
        setUserTypes(data.types || []);
      }

      if (fieldsRes.ok) {
        const data = await fieldsRes.json();
        setProfileFields(data.fields || []);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.profile) {
          setProfile(data.profile);
          setFormData({
            display_name: data.profile.display_name || '',
            bio: data.profile.bio || '',
            birth_date: data.profile.birth_date || '',
            language: data.profile.language || 'es'
          });
          setCustomFields(data.profile.custom_fields || {});
        }
      }

      if (relRes.ok) {
        const data = await relRes.json();
        setRelationships(data.relationships || []);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userTypeId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_type_id: userTypeId,
          display_name: user?.nombre || '',
          language: lang
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          custom_fields: customFields
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || Object.values(obj)[0] || '';
  };

  // Helper function to get proper locale code
  const getLocale = () => {
    return lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
  };

  const texts = {
    es: {
      title: 'Mi Perfil',
      subtitle: 'Gestiona tu información personal',
      createProfile: 'Crear Perfil',
      selectType: 'Selecciona tu tipo de usuario',
      edit: 'Editar',
      save: 'Guardar',
      cancel: 'Cancelar',
      displayName: 'Nombre para mostrar',
      bio: 'Biografía',
      birthDate: 'Fecha de nacimiento',
      language: 'Idioma preferido',
      generalInfo: 'Información General',
      customFields: 'Campos Adicionales',
      relationships: 'Relaciones',
      settings: 'Configuración',
      userType: 'Tipo de Usuario',
      memberSince: 'Miembro desde',
      noRelationships: 'Sin relaciones registradas',
      dependents: 'Dependientes',
      guardian: 'Acudiente'
    },
    en: {
      title: 'My Profile',
      subtitle: 'Manage your personal information',
      createProfile: 'Create Profile',
      selectType: 'Select your user type',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      displayName: 'Display Name',
      bio: 'Bio',
      birthDate: 'Birth Date',
      language: 'Preferred Language',
      generalInfo: 'General Information',
      customFields: 'Additional Fields',
      relationships: 'Relationships',
      settings: 'Settings',
      userType: 'User Type',
      memberSince: 'Member since',
      noRelationships: 'No relationships registered',
      dependents: 'Dependents',
      guardian: 'Guardian'
    },
    zh: {
      title: '我的资料',
      subtitle: '管理您的个人信息',
      createProfile: '创建资料',
      selectType: '选择您的用户类型',
      edit: '编辑',
      save: '保存',
      cancel: '取消',
      displayName: '显示名称',
      bio: '简介',
      birthDate: '出生日期',
      language: '首选语言',
      generalInfo: '基本信息',
      customFields: '附加字段',
      relationships: '关系',
      settings: '设置',
      userType: '用户类型',
      memberSince: '加入时间',
      noRelationships: '暂无关系记录',
      dependents: '受抚养人',
      guardian: '监护人'
    }
  };

  const txt = texts[lang] || texts.es;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="profile-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No profile - show creation flow
  if (!profile) {
    return (
      <Card data-testid="create-profile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {txt.createProfile}
          </CardTitle>
          <CardDescription>{txt.selectType}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTypes.map((type) => (
              <Card 
                key={type.type_id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => createProfile(type.type_id)}
                data-testid={`user-type-${type.type_id}`}
              >
                <CardContent className="pt-6 text-center">
                  <div 
                    className="text-4xl mb-2"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  >
                    {type.icon || '👤'}
                  </div>
                  <h3 className="font-semibold">{getLocalizedText(type.name)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getLocalizedText(type.description)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const userTypeInfo = profile.user_type_info || {};

  return (
    <div className="space-y-6" data-testid="user-profile">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl" style={{ backgroundColor: userTypeInfo.color || '#6366f1' }}>
                {(profile.display_name || user?.nombre || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold" data-testid="profile-name">
                  {profile.display_name || user?.nombre}
                </h2>
                <Badge style={{ backgroundColor: userTypeInfo.color || '#6366f1' }}>
                  {userTypeInfo.icon} {getLocalizedText(userTypeInfo.name)}
                </Badge>
              </div>
              
              {profile.bio && (
                <p className="text-muted-foreground">{profile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.birth_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(profile.birth_date).toLocaleDateString(lang)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  {txt.memberSince}: {new Date(profile.created_at).toLocaleDateString(lang)}
                </span>
              </div>
            </div>

            <Button 
              variant={editing ? "outline" : "default"}
              onClick={() => setEditing(!editing)}
              data-testid="edit-profile-btn"
            >
              {editing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {txt.cancel}
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {txt.edit}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" data-testid="general-tab">
            <User className="h-4 w-4 mr-2" />
            {txt.generalInfo}
          </TabsTrigger>
          <TabsTrigger value="relationships" data-testid="relationships-tab">
            <Users className="h-4 w-4 mr-2" />
            {txt.relationships}
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">
            <Settings className="h-4 w-4 mr-2" />
            {txt.settings}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{txt.displayName}</Label>
                      <Input
                        value={formData.display_name}
                        onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                        data-testid="display-name-input"
                      />
                    </div>
                    <div>
                      <Label>{txt.birthDate}</Label>
                      <Input
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                        data-testid="birth-date-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{txt.bio}</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={3}
                      data-testid="bio-input"
                    />
                  </div>
                  <div>
                    <Label>{txt.language}</Label>
                    <Select 
                      value={formData.language} 
                      onValueChange={(v) => setFormData({...formData, language: v})}
                    >
                      <SelectTrigger data-testid="language-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Fields */}
                  {profileFields.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-4">{txt.customFields}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileFields
                          .filter(f => !f.applicable_user_types?.length || f.applicable_user_types.includes(profile.user_type_id))
                          .map((field) => (
                            <div key={field.field_id}>
                              <Label>{getLocalizedText(field.label)}</Label>
                              {field.field_type === 'textarea' ? (
                                <Textarea
                                  value={customFields[field.field_key] || ''}
                                  onChange={(e) => setCustomFields({...customFields, [field.field_key]: e.target.value})}
                                  placeholder={getLocalizedText(field.placeholder)}
                                />
                              ) : field.field_type === 'select' ? (
                                <Select
                                  value={customFields[field.field_key] || ''}
                                  onValueChange={(v) => setCustomFields({...customFields, [field.field_key]: v})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={getLocalizedText(field.placeholder)} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options?.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {getLocalizedText(opt.label)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={field.field_type === 'number' ? 'number' : 'text'}
                                  value={customFields[field.field_key] || ''}
                                  onChange={(e) => setCustomFields({...customFields, [field.field_key]: e.target.value})}
                                  placeholder={getLocalizedText(field.placeholder)}
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={saveProfile} className="w-full" data-testid="save-profile-btn">
                    <Save className="h-4 w-4 mr-2" />
                    {txt.save}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{txt.displayName}</p>
                      <p className="font-medium">{profile.display_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{txt.birthDate}</p>
                      <p className="font-medium">
                        {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString(lang) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{txt.language}</p>
                      <p className="font-medium">
                        {profile.language === 'es' ? 'Español' : profile.language === 'en' ? 'English' : '中文'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{txt.userType}</p>
                      <p className="font-medium">
                        {userTypeInfo.icon} {getLocalizedText(userTypeInfo.name)}
                      </p>
                    </div>
                  </div>

                  {profile.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground">{txt.bio}</p>
                      <p>{profile.bio}</p>
                    </div>
                  )}

                  {/* Display Custom Fields */}
                  {Object.keys(profile.custom_fields || {}).length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-4">{txt.customFields}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileFields
                          .filter(f => profile.custom_fields?.[f.field_key])
                          .map((field) => (
                            <div key={field.field_id}>
                              <p className="text-sm text-muted-foreground">{getLocalizedText(field.label)}</p>
                              <p className="font-medium">{profile.custom_fields[field.field_key]}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships">
          <Card>
            <CardContent className="pt-6">
              {relationships.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="no-relationships">
                  {txt.noRelationships}
                </p>
              ) : (
                <div className="space-y-4" data-testid="relationships-list">
                  {relationships.map((rel) => (
                    <div 
                      key={rel.relationship_id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {(rel.related_user_profile?.display_name || 'U')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {rel.related_user_profile?.display_name || 'Usuario'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {rel.is_primary 
                              ? getLocalizedText(rel.role_2) || txt.dependents
                              : getLocalizedText(rel.role_1) || txt.guardian
                            }
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {rel.relationship_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Notificaciones</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.notifications_enabled ? 'Activadas' : 'Desactivadas'}
                    </p>
                  </div>
                  <Badge variant={profile.notifications_enabled ? 'default' : 'secondary'}>
                    {profile.notifications_enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Zona horaria</p>
                    <p className="text-sm text-muted-foreground">{profile.timezone || 'America/Panama'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Verificado</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.is_verified ? 'Cuenta verificada' : 'Pendiente de verificación'}
                    </p>
                  </div>
                  <Badge variant={profile.is_verified ? 'default' : 'secondary'}>
                    {profile.is_verified ? '✓' : '○'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
